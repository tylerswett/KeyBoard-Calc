const { app, screen,Menu, Tray, BrowserWindow, globalShortcut, ipcMain } = require('electron')
const { evaluate } = require('mathjs')
const path = require('path')
const ss = require('./steelseries.js')

const keyMap = {
    MediaPlayPause: "clear",
    NumpadDecimal: ".",
    NumpadEnter: "=",
    NumpadAdd: "+",
    NumpadSubtract: "-",
    NumpadMultiply: "*",
    NumpadDivide: "/",
    Numpad0: "0",
    Numpad1: "1",
    Numpad2: "2",
    Numpad3: "3",
    Numpad4: "4",
    Numpad5: "5",
    Numpad6: "6",
    Numpad7: "7",
    Numpad8: "8",
    Numpad9: "9"
}

let useNumpad = true;
let calculatorActive = false;
let history = [];
let currentLine = "";
let historyLine = "";
let prevNum = "";
let currentOperation = "";
let lastEnterOperation = "";
let lastEnterNumber = "";
let win;

function createWindow () {
    if(BrowserWindow.getAllWindows().length==0) {
        let display = screen.getPrimaryDisplay();
        let width = display.bounds.width;
        let height = display.bounds.height;
        const win = new BrowserWindow({
            width: 200,
            height: 300,
            x: width - 200,
            y: height - 300,
            titleBarStyle: "hidden",
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                enableRemoteModule: false,
                preload: path.join(__dirname, "preload.js")
            }
        })

        win.loadFile('index.html')

        if(history.length>0) {
            win.webContents.send("clear-history", true);
            for (var i=0; i<history.length; i++) {
                win.webContents.send("add-history",history[i]);
            }
        }
    }
}

function checkNumlock(e) {
    if(useNumpad) {
        enableCalculator(!calculatorActive);
    }
}

function enableCalculator(enabled) {
    calculatorActive = enabled;
    if(calculatorActive) {
        ss.setDisplayLines("SSCALC","Calculator Active", historyLine ? historyLine : "_");
        
        createWindow();
        win = BrowserWindow.getAllWindows()[0];
  
        win.webContents.on("before-input-event", processKeys);
    } else {
        ss.setDisplayLines("SSCALC","Calculator Disabled", "NumLock to Enable");
        win = BrowserWindow.getAllWindows()[0];
        if(win) {
            win.close();
        }
    }
}

function processKeys(event, input) {
    if(input.type == 'keyUp') {
        if(input.key == 'MediaPlayPause') {
            if(currentLine == "") {
                currentLine = "Press again to C";
            } else if (currentLine == "Press again to C") {
                prevNum = "";
                currentOperation = null;
                currentLine = "";
                win.webContents.send("clear-history", true);
            } else {
                currentLine = currentLine.substring(0,currentLine.length-1);
            }
            historyLine = `${prevNum}${currentOperation ? currentOperation : ""}`;
            ss.setDisplayLines("SSCALC",historyLine, `${currentLine}_`);
        } else if(input.code == 'NumpadEnter') {
            if(currentOperation!="" && prevNum !="") {
                if(currentLine == "Press again to C") currentLine = "";
                if(currentLine=="") {
                    currentOperation = lastEnterOperation;
                    currentLine = lastEnterNumber;
                }
                let result = evaluate(`${prevNum}${currentOperation}${currentLine}`);
                historyLine = `${prevNum}${currentOperation}${currentLine}=${result}`
                ss.setDisplayLines("SSCALC",historyLine,"_");
                history.push(historyLine);
                win.webContents.send("add-history", historyLine);
                lastEnterNumber = currentLine;
                lastEnterOperation = currentOperation;
                currentOperation = null;
                currentLine = "";
                prevNum = result;
            }
        } else if(input.code == 'NumpadAdd' || input.code == 'NumpadSubtract' || input.code == 'NumpadMultiply' || input.code == 'NumpadDivide') {
            if(currentLine == "Press again to C") currentLine = "";
            if(currentLine!="") {
                if(prevNum!="" && currentOperation!="") {
                    prevNum = evaluate(`${prevNum}${currentOperation}${currentLine}`);
                    let historyLine = `${prevNum}${currentOperation}${currentLine}=${prevNum}`;
                    history.push(historyLine);
                    win.webContents.send("add-history", historyLine);
                } else {
                    prevNum = currentLine;
                }
                currentLine = "";
            }
            currentOperation = keyMap[input.code];
            historyLine = `${prevNum}${currentOperation}`;
            ss.setDisplayLines("SSCALC",historyLine, `${currentLine}_`);
        } else if(keyMap[input.code]) {
            if(!currentOperation) {
                prevNum = "";
            }
            if(currentLine == "Press again to C") currentLine = "";
            currentLine += keyMap[input.code];
            historyLine = `${prevNum}${currentOperation ? currentOperation : ""}`;
            ss.setDisplayLines("SSCALC",historyLine, `${currentLine}_`);
        }
            
    }
}

let trayMenu = null;
app.whenReady().then(() => {
    trayMenu = new Tray('./images/icon.png')
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Toggle Calculator Using Num Lock', type: 'checkbox', checked: true, click: trayClickHandler },
        { label: 'Quit App', type: 'normal', click: quitApp}
    ])
    trayMenu.setToolTip("Calculator for SteelSeries keyboards");
    trayMenu.setContextMenu(contextMenu);
    contextMenu.on('click', trayClickHandler);

    ss.registerApp('SSCALC','Calculator','Tyler Swett');
    globalShortcut.register('Numlock',checkNumlock);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      //createWindow()
    }
  })
})

function trayClickHandler(event) {
    useNumpad = event.checked;
}

function quitApp() {
    ss.deregisterApp("SSCALC");
    app.quit();
}

app.on('window-all-closed', (e) => {
    e.preventDefault()
    e.returnValue = false
    enableCalculator(false);
})
