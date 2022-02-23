const http = require("http");
const os = require("os");
const fs = require("fs");

/*
Global SteelSeries Connection Details
*/
let steelSeriesHostName;
let steelSeriesPort;

exports.registerApp = function(allCapsAppIdentifier, appDisplayName, appDeveloper) {
    return new Promise((resolve, reject) => {
        //Retrieve SteelSeries configuration file
        let configFilePath = "";
        if (os.platform() === "win32") {
            configFilePath =
                process.env.ProgramData +
                "/SteelSeries/SteelSeries Engine 3/coreProps.json";
        } else if (os.platform() === "darwin") {
            configFilePath =
                "/Library/Application Support/SteelSeries Engine 3/coreProps.json";
        } else {
            console.error(
                "Sorry, ggVSCode is only available on Windows and macOS"
            );
        }

        //read the config file and store the server address
        if (configFilePath) {
            fs.readFile(configFilePath, "utf8", async (err, data) => {
                if (err) {
                    console.error(err);
                    return;
                }

                // Parse config
                const configJSON = JSON.parse(data);
                const steelSeriesAddress = configJSON.address.split(":");
                steelSeriesHostName = steelSeriesAddress[0];
                steelSeriesPort = steelSeriesAddress[1];
                console.log(
                    "Got SteelSeries server address: " +
                        steelSeriesHostName +
                        "!! Port: " +
                        steelSeriesPort
                );

                //register app details to SteelSeries GG
                const metaData = {
                    game: allCapsAppIdentifier,
                    game_display_name: appDisplayName,
                    developer: appDeveloper,
                    deinitialize_timer_length_ms: 30000,
                };

                const metaDataResp = await this.webRequest(
                    "/game_metadata",
                    metaData
                );
                console.log("Registered app with SteelSeries GG", metaDataResp);

                //register game event with SteelSeries GG
                const gameEventRegistration = {
                    game: "GGCODE",
                    event: "SHOWMESSAGE",
                    value_optional: true,
                    handlers: [
                        {
                            "device-type": "screened",
                            mode: "screen",
                            zone: "one",
                            datas: [
                                {
                                    lines: [
                                        {
                                            "has-text": true,
                                            "context-frame-key": "line-one",
                                        },
                                        {
                                            "has-text": true,
                                            "context-frame-key": "line-two",
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                };
                var bindGameEventResp = await this.webRequest(
                    "/bind_game_event",
                    gameEventRegistration
                );
                console.log(
                    "Binded event to SteelSeries GG",
                    bindGameEventResp
                );

                console.log(
                    'Congratulations, your extension "gg-vs-code" is now active!'
                );
                resolve(true);
            });
        }
    });
}

exports.deregisterApp = function(allCapsAppIdentifier) {
    const removeGameData = {
        game: allCapsAppIdentifier
    };
    this.webRequest("/remove_game", removeGameData);
}

exports.setDisplayLines = function(allCapsAppIdentifier, line1, line2) {
    const eventData = {
        value: 1,
        frame: {
            "line-one": line1,
            "line-two": line2,
        },
    };
    this.sendGameEvent(allCapsAppIdentifier, "SHOWMESSAGE", eventData);
    console.log("setting display lines");
}

exports.sendGameEvent = async function(allCapsAppIdentifier, eventName, eventData) {
    const gameEventData = {
        game: allCapsAppIdentifier,
        event: eventName,
        data: eventData,
    };
    var gameEventResp = await this.webRequest("/game_event", gameEventData);
    console.log("Sent game event to SteelSeries GG", gameEventResp);
}


/*
Http native wrapper
*/
exports.webRequest = function(path, body) {
    /*
            Request details
        */
    const requestData = JSON.stringify(body);
    const parameters = {
        hostname: steelSeriesHostName,
        port: steelSeriesPort,
        path: path,
        method: "post",
        headers: {
            "Content-Type": "application/json",
            "Content-Length": requestData.length,
        },
    };

    /*
            Perform web request
            */
    return new Promise((resolve, reject) => {
        let responseData = [];
        const request = http.request(parameters, (res) => {
            console.log(`Status code: ${res.statusCode}`);
            res.on("data", (d) => {
                responseData.push(d);
            });
            res.on("end", () => {
                resolve(String(Buffer.concat(responseData)));
            });
        });
        request.write(requestData);
        request.on("error", (error) => {
            console.error(error);
            reject(error);
        });
        request.end();
    });
}
