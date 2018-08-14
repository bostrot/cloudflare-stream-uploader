// ssl cert stuff
var fs = require('fs');
var https = require('https');
var request = require('request');
var privateKey = fs.readFileSync('certs/server.key', 'utf8');
var certificate = fs.readFileSync('certs/server.crt', 'utf8');
var credentials = {
    key: privateKey,
    cert: certificate
};

// chunk with flow
process.env.TMPDIR = 'tmp';
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();
var flow = require('./flow-node.js')('tmp');

var express = require('express');
const app = express();

var fs = require('fs-extra');
var tus = require('tus-js-client');
var fetch = require('node-fetch')

// Configure access control allow origin header stuff
var ACCESS_CONTROLL_ALLOW_ORIGIN = false;

const crypto = require('crypto')
const bs58 = require('bs58')

// Host most stuff in the public folder
app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/src'));

// debugging
var uploadCF = true;

// cf auth
var zone_url = "https://api.cloudflare.com/client/v4/zones/YOUR_ZONE_ID/media";
/* get your zone id with e.g. curl -X GET "https://api.cloudflare.com/client/v4/zones?name=example.com&status=active&page=1&per_page=20&order=status&direction=desc&match=all" \
     -H "X-Auth-Email: user@example.com" \
     -H "X-Auth-Key: c2547eb745079dac9320b638f5e225cf483cc5cfdda41" \
     -H "Content-Type: application/json" */
var email = "YOUR_CF_EMAIL";
var auth_key = "YOUR_CF_AUTHKEY";
var cStatus = [];

function ipfsHash(filename, result) {
    fs.createReadStream("uploads/" + filename).
    pipe(crypto.createHash('sha1').setEncoding('hex')).
    on('finish', async function () {
        var tempHash = await this.read();
        generateHash(tempHash, function (hash) {
            result(hash);
        })
    })
}

function generateHash(sha1, hash) {
    const hashFunction = Buffer.from('12', 'hex')
    const digest = crypto.createHash('sha256').update(sha1).digest()
    const digestSize = Buffer.from(digest.byteLength.toString(16), 'hex')
    const combined = Buffer.concat([hashFunction, digestSize, digest])
    const multihash = bs58.encode(combined)
    hash(multihash.toString());
}

/*
clear all - delete all saved cf videos
    request({
        url: zone_url,
        headers: {
            "X-Auth-Email": email,
            "X-Auth-Key": auth_key,
        }
    }, function (err, res, body) {
        var temp = JSON.parse(body)["result"];
        for (var i = 0; i < temp.length; i++) {
            console.log(zone_url+temp[i]["uid"])
            request.delete({
                url: zone_url+"/"+temp[i]["uid"],
                headers: {
                    "X-Auth-Email": email,
                    "X-Auth-Key": auth_key,
                }
            }, function (err, res, body) {
                console.log(body)
            })
        }
    })
*/

// check if video already exists
app.get('/check/:hash', function (req, response) {
    generateHash(req.params.hash, function (hash) {
        //console.log(hash);
        request({
            url: zone_url,
            headers: {
                "X-Auth-Email": email,
                "X-Auth-Key": auth_key,
            }
        }, function (err, res, body) {
            //console.log(body)
            var picked = JSON.parse(body)["result"].find(o => o.meta.name === hash);
            if (picked != undefined) {
                response.json({
                    response: 200,
                    hash: hash
                })
            } else {
                response.json({
                    response: 404
                })
            }
        })
    })
});

// Handle uploads through Flow.js
app.post('/upload', multipartMiddleware, function (req, res) {
    console.log(req.headers);
    // do some authentication
    flow.post(req, function (status, filename, original_filename, identifier) {
        if (ACCESS_CONTROLL_ALLOW_ORIGIN) {
            res.header("Access-Control-Allow-Origin", "*");
        }
        if (status === 'done') {
            var s = fs.createWriteStream('./uploads/' + filename);
            s.on('finish', function () {
                console.log("Upload Finished of " + identifier);
                flow.clean(identifier);
                ipfsHash(filename, function (tempName) {
                    request({
                        url: zone_url,
                        headers: {
                            "X-Auth-Email": email,
                            "X-Auth-Key": auth_key,
                        }
                    }, function (err, res, body) {
                        var picked = JSON.parse(body)["result"].find(o => o.meta.name === tempName);
                        if (picked == undefined) {
                            if (uploadCF) {
                                try {
                                    var path = __dirname + '/uploads/' + filename;
                                    var file = fs.createReadStream(path);
                                    var size = fs.statSync(path).size;

                                    var options = {
                                        endpoint: zone_url,
                                        headers: {
                                            "X-Auth-Email": email,
                                            "X-Auth-Key": auth_key,
                                        },
                                        resume: true,
                                        metadata: {
                                            label: [tempName],
                                            name: tempName,
                                            filename: filename
                                        },
                                        uploadSize: size,
                                        onError: function (error) {
                                            console.log(error);
                                            fs.unlink(path, (err) => {
                                                if (err) console.log(err);
                                                console.log(path + ' was deleted');
                                            });
                                        },
                                        onProgress: function (bytesUploaded, bytesTotal) {
                                            var percentage = (bytesUploaded / bytesTotal * 100).toFixed(2);
                                            cStatus[identifier] = {
                                                videohash: tempName,
                                                url: "https://watch.cloudflarestream.com" + (upload.url).split("/media")[1],
                                                status: percentage,
                                                ready: false,
                                                processing: {},
                                            };
                                            //console.log(bytesUploaded, bytesTotal, percentage + "%");
                                        },
                                        onSuccess: function () {
                                            //res.setHeader('Content-Type', 'application/json');
                                            //res.send(JSON.parse('{ "response": 200, "url": "' + ("https://watch.cloudflarestream.com" + (upload.url).split("/media")[1]).toString() + '" }'));           //where to go next
                                            var ready = false;
                                            var processing;
                                            var updateInterval;
                                            // clean every day from now on
                                            var minutes = 0.1,
                                                interval = minutes * 60 * 1000;

                                            function updateStatus() {
                                                try {
                                                    request({
                                                        url: upload.url,
                                                        headers: {
                                                            "X-Auth-Email": email,
                                                            "X-Auth-Key": auth_key,
                                                        }
                                                    }, function (err, res, body) {
                                                        //console.log(JSON.parse(body)["result"])
                                                        cStatus[identifier]["ready"] = JSON.parse(body)["result"]["readyToStream"];
                                                        cStatus[identifier]["processing"] = JSON.parse(body)["result"]["status"];
                                                        ready = JSON.parse(body)["result"]["readyToStream"];
                                                        try {
                                                            processing = JSON.parse(body)["result"]["status"];
                                                        } catch (e) {}
                                                        if (ready == true) {
                                                            clearInterval(updateInterval);
                                                        }
                                                    })
                                                } catch (e) {}
                                            }
                                            updateStatus();

                                            updateInterval = setInterval(updateStatus, interval);

                                            fs.unlink(path, (err) => {
                                                if (err) console.log("File not deleted");
                                                console.log(path + ' was deleted');
                                            });
                                        }
                                    }
                                    var upload = new tus.Upload(file, options);
                                    upload.start();
                                } catch (e) {
                                    console.log(e)
                                }
                            };
                        } else {
                            cStatus[identifier] = {
                                videohash: tempName,
                                status: "100.00",
                                ready: true,
                                processing: {
                                    state: "ready"
                                },
                            };
                        }
                    })

                })
            });

            flow.write(identifier, s, {});
            //res.status(/^(partly_done|done)$/.test(status) ? 200 : 500).send();
        }
        res.status(/^(partly_done|done)$/.test(status) ? 200 : 500).send();
    });

});

app.options('/upload', function (req, res) {
    console.log('OPTIONS');
    if (ACCESS_CONTROLL_ALLOW_ORIGIN) {
        res.header("Access-Control-Allow-Origin", "*");
    }
    res.status(200).send();
});

// Handle status checks on chunks through Flow.js
app.get('/upload', function (req, res) {
    flow.get(req, function (status, filename, original_filename, identifier) {
        console.log('GET', status);
        if (ACCESS_CONTROLL_ALLOW_ORIGIN) {
            res.header("Access-Control-Allow-Origin", "*");
        }

        if (status == 'found') {
            status = 200;
        } else {
            status = 204;
        }

        res.status(status).send();
    });
});

// Handle status checks on chunks through Flow.js
app.get('/status/:id', function (req, res) {
    if (req.params.id != undefined) {
        try {
            res.json(cStatus[req.params.id]);
        } catch (e) {
            res.json({
                "result": "error",
            })
        }
    } else {
        res.json({
            "result": "error",
        })
    }
});

var httpsServer = https.createServer(credentials, app);
httpsServer.listen(80, () => console.log("Example app listening on port %d!", httpsServer.address().port));