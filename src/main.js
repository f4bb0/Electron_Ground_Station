const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { Client } = require('ssh2')
const dgram = require('dgram')

function createWindow() {
  const win = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  win.loadFile('src/index.html')
}

// SSH连接处理
ipcMain.on('ssh-connect', (event, config) => {
  const conn = new Client()
  
  conn.on('ready', () => {
    event.reply('ssh-connected')
    conn.shell((err, stream) => {
      if (err) {
        event.reply('ssh-error', err.message)
        return
      }

      stream.on('data', (data) => {
        event.reply('ssh-data', data.toString())
      })

      stream.on('close', () => {
        event.reply('ssh-closed')
      })

      // 存储stream用于发送命令
      event.reply('ssh-shell-ready')
      global.sshStream = stream
    })
  })

  conn.on('error', (err) => {
    event.reply('ssh-error', err.message)
  })

  conn.connect(config)
})

// 添加SSH数据处理事件
ipcMain.on('ssh-data', (event, data) => {
  if (global.sshStream) {
    global.sshStream.write(data)
  }
})

// UDP服务
const udpServer = dgram.createSocket('udp4')
udpServer.on('listening', () => {
  console.log('UDP Server listening')
})

udpServer.on('message', (msg, rinfo) => {
  // 向所有窗口广播UDP数据
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send('udp-data', msg.toString())
  })
})

ipcMain.on('start-udp', (event, port) => {
  udpServer.bind(port)
})

// GStreamer 处理
ipcMain.on('gstreamer-launch', (event, pipeline) => {
  const { spawn } = require('child_process');
  const gstreamer = spawn('gst-launch-1.0', pipeline.split(' '));

  gstreamer.stdout.on('data', (data) => {
    // Handle GStreamer stdout if needed
    console.log(`GStreamer stdout: ${data}`);
  });

  gstreamer.stderr.on('data', (data) => {
    console.error(`GStreamer stderr: ${data}`);
    event.reply('gstreamer-error', data.toString());
  });

  gstreamer.on('close', (code) => {
    console.log(`GStreamer process exited with code ${code}`);
    event.reply('gstreamer-closed', code);
  });

  // Store gstreamer process to allow for stopping it
  global.gstreamerProcess = gstreamer;
});

ipcMain.on('gstreamer-stop', (event) => {
  if (global.gstreamerProcess) {
    global.gstreamerProcess.kill();
    global.gstreamerProcess = null;
    event.reply('gstreamer-stopped');
  }
});

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
