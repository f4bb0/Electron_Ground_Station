const { ipcRenderer } = require('electron')

// 初始化终端
const term = new Terminal({
    cursorBlink: true,
    theme: {
        background: '#000000',
        foreground: '#ffffff'
    }
})
const fitAddon = new FitAddon.FitAddon()
term.loadAddon(fitAddon)
term.open(document.getElementById('terminal'))
fitAddon.fit()

// SSH连接处理
document.getElementById('connect').addEventListener('click', () => {
    const config = {
        host: document.getElementById('host').value,
        username: document.getElementById('username').value,
        password: document.getElementById('password').value,
        port: parseInt(document.getElementById('port').value) || 22
    }
    
    const statusEl = document.getElementById('ssh-status')
    statusEl.textContent = 'Connecting...'
    statusEl.style.color = 'orange'
    
    ipcRenderer.send('ssh-connect', config)
})

// 终端输入处理
term.onData(data => {
    ipcRenderer.send('ssh-data', data)
})

// SSH事件监听
ipcRenderer.on('ssh-data', (event, data) => {
    term.write(data)
})

ipcRenderer.on('ssh-connected', () => {
    const statusEl = document.getElementById('ssh-status')
    statusEl.textContent = 'Connected'
    statusEl.style.color = 'green'
})

ipcRenderer.on('ssh-shell-ready', () => {
    const statusEl = document.getElementById('ssh-status')
    statusEl.textContent = 'Shell Ready'
    statusEl.style.color = 'green'
})

ipcRenderer.on('ssh-error', (event, message) => {
    const statusEl = document.getElementById('ssh-status')
    statusEl.textContent = `Error: ${message}`
    statusEl.style.color = 'red'
    console.error('SSH Error:', message)
})

ipcRenderer.on('ssh-closed', () => {
    const statusEl = document.getElementById('ssh-status')
    statusEl.textContent = 'Disconnected'
    statusEl.style.color = 'gray'
})

// UDP处理
document.getElementById('startUDP').addEventListener('click', () => {
    const port = parseInt(document.getElementById('udpPort').value)
    ipcRenderer.send('start-udp', port)
})

// UDP数据显示
const dataStream = document.getElementById('data-stream')
ipcRenderer.on('udp-data', (event, data) => {
    const div = document.createElement('div')
    div.textContent = `${new Date().toISOString()}: ${data}`
    dataStream.appendChild(div)
    dataStream.scrollTop = dataStream.scrollHeight
})

// 窗口大小改变时调整终端大小
window.addEventListener('resize', () => {
    fitAddon.fit()
})
