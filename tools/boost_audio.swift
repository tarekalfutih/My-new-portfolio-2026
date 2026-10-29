// Make a quiet video's sound louder in a new file (macOS, no installs). The picture is copied as is.
//
//   swift tools/boost_audio.swift <in.mp4> <out.mp4> <dB> [untilSeconds]
//
// With untilSeconds the gain only applies to the start of the video and fades back to the
// original level over the next second (e.g. -15 3 9: a too-loud intro, rest untouched).
//
// Why: a browser-side boost (Web Audio) starts silent and stutters in iPhone Safari on long videos.
// The sound gets the gain plus a peak limiter at -1 dBFS (instant attack, 150 ms release), so loud
// moments don't clip. Output is fast-start AAC 128 kbps; the source file is never touched.
import AVFoundation
import Foundation

let a = CommandLine.arguments
guard a.count == 4 || a.count == 5, let DB = Float(a[3]) else { print("usage: swift boost_audio.swift <in> <out.mp4> <dB> [untilSeconds]"); exit(2) }
let UNTIL: Double? = a.count == 5 ? Double(a[4]) : nil
let src = URL(fileURLWithPath: a[1]), dst = URL(fileURLWithPath: a[2])
try? FileManager.default.removeItem(at: dst)

let asset = AVURLAsset(url: src)
let sema = DispatchSemaphore(value: 0)
var vTrack: AVAssetTrack?, aTrack: AVAssetTrack?
var vFormat: CMFormatDescription?, aFormat: CMFormatDescription?, transform = CGAffineTransform.identity
Task {
    vTrack = try? await asset.loadTracks(withMediaType: .video).first
    aTrack = try? await asset.loadTracks(withMediaType: .audio).first
    if let v = vTrack { vFormat = try? await v.load(.formatDescriptions).first; transform = (try? await v.load(.preferredTransform)) ?? .identity }
    if let t = aTrack { aFormat = try? await t.load(.formatDescriptions).first }
    sema.signal()
}
sema.wait()
guard let vt = vTrack, let at = aTrack, let af = aFormat,
      let asbd = CMAudioFormatDescriptionGetStreamBasicDescription(af)?.pointee else { print("needs a video and an audio track"); exit(1) }
let rate = asbd.mSampleRate, ch = Int(asbd.mChannelsPerFrame)

let reader = try AVAssetReader(asset: asset)
let vOut = AVAssetReaderTrackOutput(track: vt, outputSettings: nil)   // passthrough
let aOut = AVAssetReaderTrackOutput(track: at, outputSettings: [
    AVFormatIDKey: kAudioFormatLinearPCM, AVLinearPCMBitDepthKey: 32, AVLinearPCMIsFloatKey: true,
    AVLinearPCMIsNonInterleaved: false, AVLinearPCMIsBigEndianKey: false])
reader.add(vOut); reader.add(aOut)

let writer = try AVAssetWriter(outputURL: dst, fileType: .mp4)
writer.shouldOptimizeForNetworkUse = true
let vIn = AVAssetWriterInput(mediaType: .video, outputSettings: nil, sourceFormatHint: vFormat)
vIn.transform = transform
let aIn = AVAssetWriterInput(mediaType: .audio, outputSettings: [
    AVFormatIDKey: kAudioFormatMPEG4AAC, AVSampleRateKey: rate, AVNumberOfChannelsKey: ch, AVEncoderBitRateKey: 128_000])
vIn.expectsMediaDataInRealTime = false; aIn.expectsMediaDataInRealTime = false
writer.add(vIn); writer.add(aIn)
reader.startReading(); writer.startWriting(); writer.startSession(atSourceTime: .zero)

let gain = powf(10, DB / 20), ceiling = powf(10, -1 / 20)
let release = 1 - expf(-1 / (0.15 * Float(rate)))
var env: Float = 1, peakIn: Float = 0, limited = 0, frames = 0
// Gain at sample index i: full gain until UNTIL - 0.5 s, then a linear 1 s fade to 0 dB.
func gainAt(_ i: Int) -> Float {
    guard let u = UNTIL else { return gain }
    let t = Double(i) / rate, k = min(max((t - (u - 0.5)) / 1.0, 0), 1)
    return powf(10, DB * Float(1 - k) / 20)
}

func process(_ sb: CMSampleBuffer) {
    guard let bb = CMSampleBufferGetDataBuffer(sb) else { return }
    var len = 0, ptr: UnsafeMutablePointer<CChar>?
    guard CMBlockBufferGetDataPointer(bb, atOffset: 0, lengthAtOffsetOut: nil, totalLengthOut: &len, dataPointerOut: &ptr) == kCMBlockBufferNoErr,
          let p = ptr else { return }
    let n = len / 4 / ch
    p.withMemoryRebound(to: Float.self, capacity: n * ch) { f in
        for i in 0..<n {
            var pk: Float = 0
            let gain = gainAt(frames + i)
            for c in 0..<ch { let x = f[i * ch + c]; peakIn = max(peakIn, abs(x)); pk = max(pk, abs(x * gain)) }
            let need = pk > ceiling ? ceiling / pk : 1
            env = need < env ? need : env + (1 - env) * release
            if env < 0.999 { limited += 1 }
            for c in 0..<ch { f[i * ch + c] *= gain * env }
        }
        frames += n
    }
}

let group = DispatchGroup()
func pump(_ input: AVAssetWriterInput, _ output: AVAssetReaderTrackOutput, _ q: String, audio: Bool) {
    group.enter()
    input.requestMediaDataWhenReady(on: DispatchQueue(label: q)) {
        while input.isReadyForMoreMediaData {
            guard let sb = output.copyNextSampleBuffer() else { input.markAsFinished(); group.leave(); return }
            if audio { process(sb) }
            input.append(sb)
        }
    }
}
pump(vIn, vOut, "v", audio: false); pump(aIn, aOut, "a", audio: true)
group.wait()
writer.finishWriting { sema.signal() }
sema.wait()
if writer.status != .completed { print("failed:", writer.error ?? reader.error ?? "unknown"); exit(1) }
print(String(format: "done: source peak %.1f dBFS, +%.0f dB, limiter active %.1f%% of the time",
             20 * log10(max(peakIn, 1e-9)), DB, 100 * Double(limited) / Double(max(frames, 1))))
