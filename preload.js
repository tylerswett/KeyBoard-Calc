const {
  contextBridge,
  ipcRenderer
} = require("electron");

contextBridge.exposeInMainWorld(
  "api", {
      receive: (channel, func) => {
          let validChannels = ["clear-history", "add-history"];
          if (validChannels.includes(channel)) {
              ipcRenderer.on(channel, (event, eventPayload) => {
                func(eventPayload)
              });
          }
      }
  }
);