// Re-encode a video to a web-friendly H.264/AAC MP4 at a fixed size and bitrate (macOS, no installs).
//
//   swift tools/encode_video.swift <in> <out.mp4> <width> <height> <videoBitsPerSecond>
//
// Why: phone/screen recordings are often HEVC (not playable in Firefox or many Chrome setups)
// and far larger than a web page needs. Output is fast-start (plays before fully downloaded),
// keeps audio as 96 kbps AAC, and strips capture metadata.
import AVFoundation
import Foundation

let a = CommandLine.arguments
guard a.count == 6, let W = Int(a[3]), let H = Int(a[4]), let BPS = Int(a[5]) else {
    print("usage: swift encode_video.swift <in> <out.mp4> <width> <height> <videoBitsPerSecond>"); exit(2)
}
let src = URL(fileURLWithPath: a[1]), dst = URL(fileURLWithPath: a[2])
try? FileManager.default.removeItem(at: dst)

let asset = AVURLAsset(url: src)
let sema = DispatchSemaphore(value: 0)
var vTrack: AVAssetTrack?, aTrack: AVAssetTrack?
var duration = CMTime.zero
Task {
    vTrack = try? await asset.loadTracks(withMediaType: .video).first
    aTrack = try? await asset.loadTracks(withMediaType: .audio).first
    duration = (try? await asset.load(.duration)) ?? .zero
    sema.signal()
}
sema.wait()
guard let vt = vTrack else { print("no video track"); exit(1) }

let reader = try AVAssetReader(asset: asset)
let writer = try AVAssetWriter(outputURL: dst, fileType: .mp4)
writer.shouldOptimizeForNetworkUse = true

// Video: a video composition scales (and applies any rotation) into W×H.
let vOut = AVAssetReaderVideoCompositionOutput(videoTracks: [vt], videoSettings: [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
let comp = AVMutableVideoComposition()
comp.renderSize = CGSize(width: W, height: H)
let fps = vt.nominalFrameRate > 0 ? vt.nominalFrameRate : 30
comp.frameDuration = CMTime(value: 1, timescale: CMTimeScale(min(fps, 60).rounded()))
let inst = AVMutableVideoCompositionInstruction()
inst.timeRange = CMTimeRange(start: .zero, duration: duration)
let li = AVMutableVideoCompositionLayerInstruction(assetTrack: vt)
let nat = vt.naturalSize.applying(vt.preferredTransform)
let sx = CGFloat(W) / abs(nat.width), sy = CGFloat(H) / abs(nat.height)
li.setTransform(vt.preferredTransform.concatenating(CGAffineTransform(scaleX: sx, y: sy)), at: .zero)
inst.layerInstructions = [li]
comp.instructions = [inst]
vOut.videoComposition = comp
reader.add(vOut)

let vIn = AVAssetWriterInput(mediaType: .video, outputSettings: [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: W, AVVideoHeightKey: H,
    AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: BPS,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
        AVVideoMaxKeyFrameIntervalDurationKey: 2,
    ],
])
vIn.expectsMediaDataInRealTime = false
writer.add(vIn)

var aOut: AVAssetReaderTrackOutput?, aIn: AVAssetWriterInput?
if let at = aTrack {
    let o = AVAssetReaderTrackOutput(track: at, outputSettings: [AVFormatIDKey: kAudioFormatLinearPCM])
    reader.add(o); aOut = o
    let i = AVAssetWriterInput(mediaType: .audio, outputSettings: [
        AVFormatIDKey: kAudioFormatMPEG4AAC, AVNumberOfChannelsKey: 2,
        AVSampleRateKey: 44100, AVEncoderBitRateKey: 96000])
    writer.add(i); aIn = i
}

reader.startReading()
writer.startWriting()
writer.startSession(atSourceTime: .zero)

let group = DispatchGroup()
func pump(_ input: AVAssetWriterInput, _ output: AVAssetReaderOutput, _ q: String) {
    group.enter()
    input.requestMediaDataWhenReady(on: DispatchQueue(label: q)) {
        while input.isReadyForMoreMediaData {
            if let buf = output.copyNextSampleBuffer() { input.append(buf) }
            else { input.markAsFinished(); group.leave(); return }
        }
    }
}
pump(vIn, vOut, "v")
if let i = aIn, let o = aOut { pump(i, o, "a") }
group.wait()
let done = DispatchSemaphore(value: 0)
writer.finishWriting { done.signal() }
done.wait()
if writer.status != .completed { print("failed:", writer.error ?? "unknown"); exit(1) }
let size = (try? FileManager.default.attributesOfItem(atPath: dst.path)[.size] as? Int) ?? 0
print(String(format: "ok %@ · %.1fs · %.1f MB", aTrack != nil ? "with audio" : "no audio",
             CMTimeGetSeconds(duration), Double(size) / 1e6))
