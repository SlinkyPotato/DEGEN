const fs = require("fs")
const path = require("path")

module.exports = {
  /**
   * Finds and returns all files ending with `.js` in specified directory
   * and all sub-directories.
   * 
   * @param {String} directory Directory to start at
   * @param {Array} [fileArray] Used by recursive call to store files found so far
   * @returns Files under directory and sub-directories ending with `.js`
   */
  getFiles: (directory, fileArray) => {
    files = fs.readdirSync(directory)
    fileArray = fileArray || []
    files.forEach((file) => {
      if (fs.statSync(path.join(directory, file)).isDirectory()) {
        fileArray = module.exports.getFiles(path.join(directory, file), fileArray)
      } else if (file.endsWith('.js')) {
        fileArray.push(path.join(directory, file))
      }
    })

    return fileArray
  }
}