// Print a video's basics and save the exact frame at a given time as PNG (e.g. for a poster).
//
//   swift tools/video_frame.swift <video> <seconds> <out.png>
//
// Frame-exact (zero tolerance), so the poster is the frame at that timestamp, not the nearest
// keyframe. Make the web poster from the PNG with Pillow, e.g. resize to the encoded size and
// save as WebP next to the video in public/assets/video/.
import AVFoundation
import AppKit

let a = CommandLine.arguments
guard a.count == 4, let t = Double(a[2]) else { print("usage: swift video_frame.swift <video> <seconds> <out.png>"); exit(2) }
let asset = AVURLAsset(url: URL(fileURLWithPath: a[1]))
let sema = DispatchSemaphore(value: 0)
var info = ""
Task {
    if let v = try? await asset.loadTracks(withMediaType: .video).first {
        let (size, fps, rate) = try await v.load(.naturalSize, .nominalFrameRate, .estimatedDataRate)
        let dur = try await asset.load(.duration)
        let audio = (try? await asset.loadTracks(withMediaType: .audio).count) ?? 0
        info = String(format: "%.1fs · %.0fx%.0f · %.0f fps · %.0f kbps · audio tracks: %d",
                      CMTimeGetSeconds(dur), size.width, size.height, fps, rate / 1000, audio)
    }
    sema.signal()
}
sema.wait()
print(info)
let g = AVAssetImageGenerator(asset: asset)
g.appliesPreferredTrackTransform = true
g.requestedTimeToleranceBefore = .zero
g.requestedTimeToleranceAfter = .zero
let img = try g.copyCGImage(at: CMTime(seconds: t, preferredTimescale: 600), actualTime: nil)
let png = NSBitmapImageRep(cgImage: img).representation(using: .png, properties: [:])!
try png.write(to: URL(fileURLWithPath: a[3]))
