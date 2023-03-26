let http = require('http');
const app = require('./app');
let formidable = require('formidable');
let fs = require('fs');
let Promises = require('fs').promises;
let AdmZip = require('adm-zip');
let os = require('os');
let path = require('path');
let date = "00";
let emptyField = false;
let PORT = process.env.PORT || 3000;
let basepath = '../temp/';
const replaceText = [];
const withText = [];
let fileP = '';
let fileN = '';

//Requires: Location of zip file, HTTP Response object, zip file name, and tempDir (for cleanup)
//Effects: Performs bulk edits to contents of a zip file, saving a copy with the changes
//Example: file.zip containing a.txt,b.txt,c.txt will return file-out.zip 
//         containing a.txt,b.txt,c.txt with their changes
function handlingZip(filepath, res, name, tempDir){
    let folderName = path.join(basepath,fileNameNoExt(fileN));
    let newPromise = new Promise(function(resolve, reject){
        fs.exists(folderName, (found)=>{
      if (!found){
        fs.mkdir(folderName, (err) => {
        if (err) {
            reject(err);
        }
        });  
      }
      resolve({fph: filepath, fdn: folderName});
    });
    });
    
    //Promise will 1. Extract the Zip in Temporary, 2. Apply the replacement to its files and 3. Zip the new files for Download
    newPromise.then((fpdir)=>{extractZip(fpdir.fph,fpdir.fdn);},(err)=>{console.log("Extract Zip:" ,err);}).then((source)=>{downloadZip(folderName);},(err)=>{console.log("Download Zip: ", err);}).then((newFolder) => {loadZipCopy(name,res,tempDir);},(err) => {console.log("Load Zip Copy: ", err)});
}

//Effects: Creates the Clone Zip with all the replacements made
function loadZipCopy(name, res, tmpDir){
        let n = fileNameNoExt(name);
        let copy = n+"-out";
        let fp = path.join(basepath,copy);
        const zip = new AdmZip();
        const val = fs.readdirSync(fp, { withFileTypes: true });
        if (val){
            val.forEach(file => { zip.addLocalFile(path.join(fp,file.name));});
        }
        let nameOfOutFile = n+"-out.zip";
        let zipFileContents = zip.toBuffer();
        res.writeHead(200, {
            'Content-Disposition': `attachment; filename="${nameOfOutFile}"`,
            'Content-Type': `application\zip`,
        });
        res.end(zipFileContents);
        try{
            if (tmpDir) 
                fs.rmSync(tmpDir, { recursive: true });
          } catch (err){
              console.err("Error on cleanup:",err);
          }  
}

//Effects: Extracts the zip file
function extractZip(source, target) {
    return new Promise(function(resolve, reject) {
        try {
            let zip = new AdmZip(source);
            zip.extractAllTo(target);
            resolve(target);
            } catch (err) {
                reject(err);
            }
    });
}

//Effects: Creates new file copies with the replacements applied
function downloadZip(folderName){
    return new Promise(function(resolve,reject){
        try {
        let newFolder = folderName+"-out";
        if (!fs.existsSync(newFolder)){
            fs.mkdirSync(newFolder);
        }
        fs.readdirSync(folderName, { withFileTypes: true }).forEach(file => {
            let filePathForZipContent = path.join(folderName,file.name);
            let value = replacingText(filePathForZipContent,replaceText,withText);
            fs.writeFileSync(path.join(newFolder,file.name), value);
        });
        resolve(newFolder);
        } catch (err) {
            reject(err);
        }
    });    
}

//Effects: Loads the desired replacements into memory
function loadReplacements(fields){
    let x = 0;
    if("rowsNum" in fields){
        x = parseInt(fields.rowsNum);
    }
    for (let i=0; i<x; i++){
        if("replaceText"+i in fields){
            if(fields["replaceText"+i] === "")
                emptyField = true;
            replaceText.push(fields["replaceText"+i]);
            withText.push(fields["withText"+i]);
        }
    }
}

//Requires: file location and replacement pairs
//Effects: Returns the data with all the requested replacements
function replacingText(filePath, replaceArray, withArray) {
  let words = "";
  try {
    const data = fs.readFileSync(filePath);
    words = data.toString();
    let remain = words;
    for (let i = 0; i < replaceText.length;  i++){
        remain = replacement(remain, replaceText[i], withText[i]);
    } 
    return remain;
  } catch (err){
      console.error(`Got an error trying to read the file: ${err.message}`);
      return words;
  }
}

//Effects: Creates a replacement of the desired phrase with the new one within the text
function replacement(val, replacePhrase, withPhrase) {
    return replacePhrases(val, replacePhrase, withPhrase);  
}

//Effects: Replace all the phrases "replacePhrase" in the data with another phrase "withPhrase"
function replacePhrases(value, replacePhrase, withPhrase){
    var esc = replacePhrase.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    var reg = new RegExp(esc, 'ig');
    return value.replace(reg,withPhrase);
}

//Effects: For a given file, shows its file name without extension
//example: 'file.txt' returns 'file'
function fileNameNoExt(filePath){
    const fileName = filePath.split(".");
    return fileName[0];
}

//Effects: For a given file, shows its extension
//example: 'file.txt' returns 'txt'
function showExt(filePath){
    const fileName = filePath.split(".");
    if (fileName.length > 1)
        return fileName[1];
    else
        return '';
}

//Effects: clears array (useful for new server requests)
function clearArr(arr){
    while (arr.length) {arr.pop();}
}

app.post('/', function (req, res){
  //Create an instance of the form object
  let form = new formidable.IncomingForm();
  
  //Process the file upload in Node
  form.parse(req, function (error, fields, file) {
    let tmpDir;
    date = Date.now().toString().substring(0,6);
    try{
       tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), date));
       basepath = tmpDir;
    } catch (err){
        console.error("experienced error in building: ",err);
        res.writeHead(200);
        res.end("Error");
    }
    //Loads the replacement pairs
    loadReplacements(fields);
    let filepath = file.fileupload.filepath;
    let newpath = path.join(basepath,file.fileupload.originalFilename);
    fileN = file.fileupload.originalFilename;
    fileP = newpath;
    //Copy the uploaded file to the temporary folder
    fs.rename(filepath, newpath, function () {
        if(emptyField || newpath.normalize() === basepath.normalize()){
            clearArr(replaceText);
            clearArr(withText);
        }
        else if (showExt(fileN) === 'zip'){
            handlingZip(newpath,res,file.fileupload.originalFilename,tmpDir);
        } else {
            if (newpath.normalize() !== basepath.normalize()){
            let dataString = replacingText(newpath,replaceText,withText);
            let n = fileNameNoExt(file.fileupload.originalFilename);
            let e = showExt(file.fileupload.originalFilename);
            clearArr(replaceText);
            clearArr(withText);
            res.setHeader("Content-Type", "text/plain");
            res.setHeader("Content-Disposition", "attachment;filename="+n+"-copy."+e);
            res.writeHead(200);
            res.end(dataString);
          try{
              if (newpath) 
                  fs.rmSync(newpath, { recursive: true });
            } catch (err){
              console.log("Error on cleanup:",err);
            }  
      }
    }
    });    
  });
});

app.listen(PORT, () => {
  console.log(`Example app listening at http://localhost:${PORT}`)
})
     