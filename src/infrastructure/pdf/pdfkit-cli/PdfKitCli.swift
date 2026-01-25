import Foundation
import PDFKit
import AppKit

enum CliError: Error {
    case invalidArguments
    case fileNotFound
    case documentLoadFailed
    case pageNotFound
    case renderFailed
}

func printUsage() {
    let usage = """
    PdfKitCli usage:
      info <pdf_path>
      annotations <pdf_path> <page_index>
      render <pdf_path> <page_index> <scale> <output_path>
    """
    FileHandle.standardError.write(Data(usage.utf8))
}

func loadDocument(path: String) throws -> PDFDocument {
    let url = URL(fileURLWithPath: path)
    guard FileManager.default.fileExists(atPath: url.path) else {
        throw CliError.fileNotFound
    }
    guard let doc = PDFDocument(url: url) else {
        throw CliError.documentLoadFailed
    }
    return doc
}

func jsonPrint(_ payload: Any) throws {
    let data = try JSONSerialization.data(withJSONObject: payload, options: [.prettyPrinted])
    FileHandle.standardOutput.write(data)
    FileHandle.standardOutput.write(Data("\n".utf8))
}

func handleInfo(path: String) throws {
    let doc = try loadDocument(path: path)
    let pageCount = doc.pageCount
    var pages: [[String: Any]] = []
    pages.reserveCapacity(pageCount)
    for i in 0..<pageCount {
        guard let page = doc.page(at: i) else { continue }
        let bounds = page.bounds(for: .mediaBox)
        pages.append([
            "index": i,
            "width": bounds.width,
            "height": bounds.height
        ])
    }
    try jsonPrint([
        "pageCount": pageCount,
        "pages": pages
    ])
}

func handleAnnotations(path: String, pageIndex: Int) throws {
    let doc = try loadDocument(path: path)
    guard let page = doc.page(at: pageIndex) else {
        throw CliError.pageNotFound
    }
    let annotations = page.annotations.map { annotation -> [String: Any] in
        let bounds = annotation.bounds
        return [
            "bounds": [
                "x": bounds.origin.x,
                "y": bounds.origin.y,
                "w": bounds.size.width,
                "h": bounds.size.height
            ],
            "contents": annotation.contents ?? "",
            "pageIndex": pageIndex
        ]
    }
    try jsonPrint([
        "pageIndex": pageIndex,
        "annotations": annotations
    ])
}

func handleRender(path: String, pageIndex: Int, scale: Double, outputPath: String) throws {
    let doc = try loadDocument(path: path)
    guard let page = doc.page(at: pageIndex) else {
        throw CliError.pageNotFound
    }
    let bounds = page.bounds(for: .mediaBox)
    let targetSize = NSSize(width: bounds.width * scale, height: bounds.height * scale)
    let image = page.thumbnail(of: targetSize, for: .mediaBox)
    guard let tiff = image.tiffRepresentation,
          let rep = NSBitmapImageRep(data: tiff),
          let png = rep.representation(using: .png, properties: [:]) else {
        throw CliError.renderFailed
    }
    let outUrl = URL(fileURLWithPath: outputPath)
    let dirUrl = outUrl.deletingLastPathComponent()
    try FileManager.default.createDirectory(at: dirUrl, withIntermediateDirectories: true)
    try png.write(to: outUrl)
}

let args = CommandLine.arguments
if args.count < 3 {
    printUsage()
    exit(1)
}

let command = args[1]

 do {
    switch command {
    case "info":
        let path = args[2]
        try handleInfo(path: path)
    case "annotations":
        guard args.count >= 4, let pageIndex = Int(args[3]) else {
            throw CliError.invalidArguments
        }
        let path = args[2]
        try handleAnnotations(path: path, pageIndex: pageIndex)
    case "render":
        guard args.count >= 6,
              let pageIndex = Int(args[3]),
              let scale = Double(args[4]) else {
            throw CliError.invalidArguments
        }
        let path = args[2]
        let outputPath = args[5]
        try handleRender(path: path, pageIndex: pageIndex, scale: scale, outputPath: outputPath)
    default:
        throw CliError.invalidArguments
    }
 } catch {
    printUsage()
    exit(2)
 }
