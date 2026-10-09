// Cut the start off a video without re-encoding it (macOS, no installs).
//
//   swift tools/trim_video.swift <in> <out.mp4> <startSeconds>
//
// Passthrough export: the video and audio streams are copied as they are (same codec, size and
// quality), only the part before <startSeconds> is left out. Output is fast-start MP4.
import AVFoundation
import Foundation

let a = CommandLine.arguments
guard a.count == 4, let start = Double(a[3]) else {
    print("usage: swift trim_video.swift <in> <out.mp4> <startSeconds>"); exit(2)
}
let src = URL(fileURLWithPath: a[1]), dst = URL(fileURLWithPath: a[2])
try? FileManager.default.removeItem(at: dst)

let asset = AVURLAsset(url: src)
let sema = DispatchSemaphore(value: 0)
var failure: String?
Task {
    do {
        let duration = try await asset.load(.duration)
        guard let ex = AVAssetExportSession(asset: asset, presetName: AVAssetExportPresetPassthrough) else {
            failure = "passthrough export not available"; sema.signal(); return
        }
        let from = CMTime(seconds: start, preferredTimescale: 600)
        ex.timeRange = CMTimeRange(start: from, end: duration)
        ex.shouldOptimizeForNetworkUse = true
        try await ex.export(to: dst, as: .mp4)
    } catch {
        failure = "\(error)"
    }
    sema.signal()
}
sema.wait()
if let f = failure { print("failed: \(f)"); exit(1) }
print("wrote \(dst.path)")
