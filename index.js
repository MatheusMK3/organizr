// Let's use a Promise-based fs implementation
const fs = require('fs').promises
const fsRaw = require('fs')
const path = require('path')
const Table = require('cli-table')
const dateformat = require('dateformat')

const pathExists = function (path) {
  try { return fsRaw.statSync(path) }
  catch { return false }
}
const pathIsDir = function (path) {
  let pathInfo = pathExists(path)

  if (!pathInfo)
    return false

  return pathInfo.isDirectory()
}

const FileEntry = function FileEntry (dir, file) {
  // Sets the path and base filenames
  this.path = dir
  this.base = file

  // File create/modified times
  let ctime = { min: undefined, max: undefined }
  let mtime = { min: undefined, max: undefined }

  // Return values for ctime and mtime
  this.ctime = () => { return ctime }
  this.mtime = () => { return mtime }

  // Handles our extensions
  let extensions = []
  this.getFileExtensions = () => (extensions.length > 0) ? extensions : ['']
  this.getFileWithExtensions = () => this.getFileExtensions().map(ext => ext.length > 0 ? `${this.base}.${ext}` : this.base)

  // Adds an extension
  this.addExtension = extension => {
    // Gets the full filename
    let filePath = this.getFilePath(`${this.base}.${extension}`)

    // Get file stats
    let stats = fsRaw.lstatSync(filePath)

    // Only work with files
    if (!stats.isFile()) throw 'Not a file'

    // Updates creation and modified times
    ctime.min = !!ctime.min ? Math.min(ctime.min, stats.ctime.getTime()) : stats.ctime.getTime()
    ctime.max = !!ctime.max ? Math.max(ctime.max, stats.ctime.getTime()) : stats.ctime.getTime()
    mtime.min = !!mtime.min ? Math.min(mtime.min, stats.mtime.getTime()) : stats.mtime.getTime()
    mtime.max = !!mtime.max ? Math.max(mtime.max, stats.mtime.getTime()) : stats.mtime.getTime()

    // Adds the extension to array
    extensions.push(extension)
  }

  // Returns the full path to a file based on extension
  this.getFilePath = filename => path.join(this.path, filename)

  // Returns all file paths
  this.getFilePaths = () => this.getFileWithExtensions().map(ext => this.getFilePath(ext))

  return this
}

// ~ le main function ~
const main = async function main() {
  // Gets our current work dir
  const cwd = process.cwd()

  // Parse arguments into options
  const options = (args => {
    const defaults = {
      move: false,
      path: cwd,
      time: 'modified',
      format: 'yyyy-mm-dd',
      display: 'yyyy-mm-dd hh:MM:ss',
      prefer: 'min',
    }

    let options = {}

    args.slice(2).map(arg => {
      let argParams = arg.split('=')
      let argKey = argParams[0]
      let argVal = argParams[1] || true

      options[argKey] = argVal
    })

    return Object.assign(defaults, options)
  })(process.argv)

  // Prevents ugly notice lol
  await fs.readdir(options.path)
  console.clear()

  // Welcome text and stuff
  console.info(`Welcome to Organizr!`)
  console.info(`Selected output format: ${options.format}`)

  if (options.move)
    console.info(`Preparing to move files...`)

  // Reads the dir files
  console.info(`Getting file listing for directory '${options.path}'...`)
  const rawFiles = await fs.readdir(path.resolve(options.path))

  // Processes the files into variations (same name with different extension)
  console.info(`Processing ${rawFiles.length} entries. This may take a while...`)
  const files = {}
  rawFiles.map(filename => {
    try {
      // Parse the file name and extension
      const filenameParse = filename.split('.')

      // Extract our extension
      let fileExtension = filenameParse.pop()
      
      // Extract our file name
      let file = filenameParse.join('.')

      // Ignore dot files
      if (file.length == 0) return

      // Checks if the files array already has an entry
      if (!files[file]) files[file] = new FileEntry(cwd, file)

      // Adds the extension
      files[file].addExtension(fileExtension)
    } catch (e) { console.log(e) }
  })

  // Creates the table
  let table = new Table({
    head: ['File', 'Extensions', 'Output', 'Created', 'Modified', 'Status'],
    colWidths: [50, 50, options.format.length + 2, options.display.length + 2, options.display.length + 2, 11]
  })

  // Processes the files and table
  Object.values(files).map(file => {
    let fileTime = ((options.time == 'created') ? file.ctime() : file.mtime())[options.prefer]
    let fileTimeCreated = file.ctime()[options.prefer]
    let fileTimeModified = file.mtime()[options.prefer]
    let status = false

    // Gets the output data
    let textFileOutput = dateformat(new Date(fileTime), options.format)
    let textFileCreated = dateformat(new Date(fileTimeCreated), options.display)
    let textFileModified = dateformat(new Date(fileTimeModified), options.display)

    try {
      if (options.move) {
        status = true

        // Resolve target directory
        let targetDirectory = path.join(options.path, textFileOutput)

        // Create directory if needed
        if (!pathExists(targetDirectory))
          fsRaw.mkdirSync(targetDirectory)

        // If not a directory, we don't attempt to move
        if (!pathIsDir(targetDirectory))
          throw 'Not a directory'

        // Moves the file
        file.getFilePaths().map(filePath => fsRaw.renameSync(filePath, path.join(targetDirectory, filePath.split('/').reverse()[0])))

        // Sets status to moved
        status = true
      }
    } catch (e) { console.log(e) }

    table.push([file.base, file.getFileExtensions().join(', '), textFileOutput, textFileCreated, textFileModified, status ? 'Moved' : 'Not Moved'])
  })

  // Print output table
  console.info(table.toString())

  // Print output info
  if (options.move)
    console.info(`Files moved.`)
  else
    console.info(`Running in preview mode. To actually move any files, add the 'move' argument.`)
}

// Invokes main, nothing very special
main()