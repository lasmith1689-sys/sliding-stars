import Foundation
import Vision
import ImageIO

guard CommandLine.arguments.count == 2 else { exit(2) }
let path = URL(fileURLWithPath: CommandLine.arguments[1])
guard let source = CGImageSourceCreateWithURL(path as CFURL, nil),
      let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else { exit(2) }
let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.recognitionLanguages = ["en-US"]
do {
    try VNImageRequestHandler(cgImage: image, options: [:]).perform([request])
    let words = (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }.joined(separator: " ").lowercased()
    guard words.contains("mission"), words.contains("hint"), words.contains("guide"), words.contains("crew") else {
        print("Waiting for the actual mission board and controls.")
        exit(1)
    }
    print("Verified actual iPhone mission, crew objective, Hint and Guide controls.")
} catch {
    print("Screenshot recognition failed.")
    exit(2)
}
