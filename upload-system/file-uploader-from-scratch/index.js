var express = require("express"),
    expressUpload = require("express-fileupload"),
    mongoose = require("mongoose"),
    path = require("path"),
    multer = require("multer"),
    gridfsStorage = require("multer-gridfs-storage"),
    grid = require("gridfs-stream"),
    methodOverride = require("method-override"),
    bodyParser = require("body-parser"),
    crypto = require("crypto")

var app = express()


//Middlewares and setting engines
app.use(bodyParser.json())
app.use(methodOverride("_method")) // this middle ware is used for the browser to respond to the 'action="/files/<%= file.filename %>?_method=DELETE"'
app.set("view engine","ejs")

// mongo connection
var mongo = 'mongodb://localhost/uploader-test'
var connection = mongoose.createConnection(mongo)
let gfs
connection.once("open",() => {
    //initialising stream
    gfs = grid(connection.db,mongoose.mongo)
    gfs.collection("upload")

})

//creating storage engine
var storage = new gridfsStorage({
    url: mongo,
    file: (req,file) => {
        return new Promise((resolve,reject) => {
            crypto.randomBytes(16,(err, buf) => {
                if(err){
                    return reject(err)
                }
                var filename = buf.toString("hex") + path.extname(file.originalname)
                var fileinfo = {
                    filename: filename,
                    bucketName: "upload"  //bucketName should match with the collection name
                }
                console.log(fileinfo)
                resolve(fileinfo)
            })
        })
    }
})
var upload = multer({storage: storage})

//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
//:::::::::::::::::::::::::::::::::::::::::  ROUTES STARTED  ::::::::::::::::::::::::::::::::::::::

app.get("/",(req,res,next)=>{
    gfs.files.find().toArray((err,files)=>{
        if(!files || files.length === 0 ){
            
            res.render("index",{status: false})    
        }
        res.render("index",{fileCount: files.length, status: true,files: files})
        
    })
    
})
app.post("/upload",upload.single("file"),(req,res)=>{
    //res.json({file: req.file})
    console.log("file recieved")
    res.redirect("/")
})

app.get("/files",(req,res)=>{
    gfs.files.find().toArray((err,files)=>{
        if(!files || files.length === 0){
            return res.status(404)
            err: "No File Exists"
        }
        return res.json(files)
    })
})
    // Displaying the required file as per the given name
app.get("/files/:filename",(req,res)=>{
    gfs.files.findOne({filename: req.params.filename},(err,file)=>{
        if(!file){
            return res.status(404).json({
                err: "There is no file of name"+ req.params.filename
            })
        }
        return res.json(file)
    })
})

//Displaying either c++ or python files:
app.get("/scripts/:filename",(req,res)=>{
    gfs.files.findOne({filename: req.params.filename},(err,file)=>{
        if(!file){
            return res.status(404).json({
                err: "There exists no file of name"+ req.params.filename
            })
        }
        if(file.contentType === "text/x-python" || file.contentType === "text/x-c++src"){
            var readStream = gfs.createReadStream(file.filename);
            readStream.pipe(res)
        }else{
            res.status(404).json({
                "err" : "There is no script file with name : " + req.params.filename
            })
    }
})
})

app.get("/show/:filename",(req,res)=>{
    gfs.files.findOne({filename: req.params.filename},(err,file)=>{
        if(!file){
            return res.status(404).json({
                err: "There exists no file of name"+ req.params.filename
            })
        }
        
    var readStream = gfs.createReadStream(file.filename);
    readStream.pipe(res)
        
    })
})
//creating a login page
app.get("/login",(req,res) =>{
    res.render("login")
})
app.post("/check",(req,res)=>{
    var data = req.body;
    usernames=["admin1","admin2","admin3","admin4"]
    passwords=["pass","pass","pass","pass"]
    index = usernames.indexOf(data.username.toString())
    if(passwords[index] === data.password.toString()){
        res.redirect("/")
        console.log("Successfully Logged In.")
    }else{
        res.redirect("/login")
    }
})

app.delete("/files/:filename",(req,res)=>{
    gfs.remove({filename: req.params.filename,root: "upload"},(err, gridStore)=>{
        if(err){return res.status(404).json({err: err})}
        console.log("successfully deleted")
        
        res.redirect("/")
    })
})
//:::::::::::::::::::::::::::::::::::   ROUTES ENDED  :::::::::::::::::::::::::::::::::::::::::::::
//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::


//listening to the port
var port = process.env.PORT || 1080;
app.listen(port,function(){
    console.log("listening to the port : ",port);
})




