const { ipcRenderer } = require('electron')
const Peer = require('simple-peer')

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

// 添加resize功能
document.querySelectorAll('.resize-handle').forEach(handle => {
    handle.addEventListener('mousedown', initResize);
});

function initResize(e) {
    e.preventDefault();
    const resizable = e.target.parentElement;
    const startWidth = resizable.offsetWidth;
    const startX = e.clientX;

    function resize(e) {
        const newWidth = startWidth + (e.clientX - startX);
        resizable.style.width = `${newWidth}px`;
        resizable.style.flex = 'none';
        fitAddon.fit();
    }

    function stopResize() {
        window.removeEventListener('mousemove', resize);
        window.removeEventListener('mouseup', stopResize);
    }

    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResize);
}

// 导航仪表初始化
document.addEventListener('DOMContentLoaded', () => {
    const dashboardToggle = document.getElementById('toggle-dashboard');
    const dashboardContent = document.querySelector('.dashboard-content');

    if (dashboardToggle && dashboardContent) {
        dashboardToggle.addEventListener('click', () => {
            dashboardToggle.classList.toggle('collapsed');
            dashboardContent.classList.toggle('collapsed');
        });
    }
    
    // 初始化导航仪表
    initInstruments();
});

function initInstruments() {
    const headingCanvas = document.getElementById('heading-canvas');
    const attitudeCanvas = document.getElementById('attitude-canvas');
    
    if (headingCanvas && attitudeCanvas) {
        const headingCtx = headingCanvas.getContext('2d');
        const attitudeCtx = attitudeCanvas.getContext('2d');
        
        // 设置画布尺寸
        headingCanvas.width = headingCanvas.height = 150;
        attitudeCanvas.width = attitudeCanvas.height = 150;
        
        // 初始化绘制
        drawHeadingIndicator(headingCtx, 0);
        drawAttitudeIndicator(attitudeCtx, 0, 0, 0);
    }
}

function drawHeadingIndicator(ctx, heading) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 10;
    
    // 清除画布
    ctx.clearRect(0, 0, width, height);
    
    // 绘制外圆
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // 绘制刻度和方向标记
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(-heading * Math.PI / 180);
    
    for (let i = 0; i < 360; i += 10) {
        const isMainDirection = i % 90 === 0;
        const length = isMainDirection ? 15 : 10;
        
        ctx.beginPath();
        ctx.moveTo(0, -radius + 5);
        ctx.lineTo(0, -radius + 5 + length);
        ctx.strokeStyle = isMainDirection ? '#fff' : '#999';
        ctx.lineWidth = isMainDirection ? 2 : 1;
        ctx.stroke();
        
        if (isMainDirection) {
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(['N', 'E', 'S', 'W'][i / 90], 0, -radius + 25);
        }
        
        ctx.rotate(Math.PI / 18); // 10度
    }
    
    ctx.restore();
    
    // 绘制中心飞机符号
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - 15); // 机头
    ctx.lineTo(centerX - 10, centerY + 5); // 左机翼
    ctx.lineTo(centerX, centerY); // 机身连接点
    ctx.lineTo(centerX + 10, centerY + 5); // 右机翼
    ctx.lineTo(centerX, centerY - 15); // 回到机头
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // 更新数值显示
    document.getElementById('heading-value').textContent = `${Math.round(heading)}°`;
}

function drawAttitudeIndicator(ctx, pitch, roll, yaw) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 10;
    
    // 清除画布
    ctx.clearRect(0, 0, width, height);
    
    // 创建圆形剪切区域
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.clip();
    
    // 移动到中心
    ctx.translate(centerX, centerY);
    
    // 获取CSS变量的颜色值
    const style = getComputedStyle(document.documentElement);
    const skyColor = style.getPropertyValue('--attitude-sky-color').trim();
    const groundColor = style.getPropertyValue('--attitude-ground-color').trim();
    const reticleColor = style.getPropertyValue('--attitude-reticle-color').trim();
    const lineColor = style.getPropertyValue('--attitude-line-color').trim();
    
    // 绘制固定的飞机准星（在最上层）
    function drawReticle() {
        ctx.save();
        // 绘制飞机参考标记（水平线和两个向下的尖角）
        ctx.beginPath();
        // 左侧横线
        ctx.moveTo(-30, 0);
        ctx.lineTo(-15, 0);
        // 左侧尖角
        ctx.moveTo(-15, 0);
        ctx.lineTo(-10, 5);
        ctx.lineTo(-5, 0);
        // 右侧尖角
        ctx.moveTo(5, 0);
        ctx.lineTo(10, 5);
        ctx.lineTo(15, 0);
        // 右侧横线
        ctx.moveTo(15, 0);
        ctx.lineTo(30, 0);
        
        ctx.strokeStyle = reticleColor;
        ctx.lineWidth = 2;
        ctx.stroke();
                
        // 添加小圆点作为中心点
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, Math.PI * 2);
        ctx.fillStyle = reticleColor;
        ctx.fill();

        ctx.restore();
    }
    
    // 保存当前状态以绘制移动的部分
    ctx.save();
    
    // 应用横滚和俯仰变换
    ctx.rotate(roll * Math.PI / 180);
    const pixelsPerDegree = (radius / 30) / 3;
    ctx.translate(0, pitch * pixelsPerDegree);
    
    // 绘制天空
    ctx.fillStyle = skyColor;
    ctx.fillRect(-radius * 2, -radius * 2, radius * 4, radius * 2);
    
    // 绘制地面
    ctx.fillStyle = groundColor;
    ctx.fillRect(-radius * 2, 0, radius * 4, radius * 2);
    
    // 绘制姿态参考线
    const pitchStep = 10;
    
    // 绘制俯仰角刻度线
    for(let i = -90; i <= 90; i += pitchStep) {
        if(i === 0) continue;
        
        const lineY = -i * pixelsPerDegree;
        const lineWidth = (i % 30 === 0) ? 15 : 7;
        
        ctx.beginPath();
        ctx.moveTo(-lineWidth/2, lineY);
        ctx.lineTo(lineWidth/2, lineY);
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // 为30度的倍数添加数字标签
        if(i % 30 === 0) {
            ctx.fillStyle = lineColor;
            ctx.font = '10px Arial';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(Math.abs(i) + '°', lineWidth/2 + 5, lineY);
            ctx.textAlign = 'right';
            ctx.fillText(Math.abs(i) + '°', -lineWidth/2 - 5, lineY);
        }
    }
    
    // 绘制地平线
    ctx.beginPath();
    ctx.moveTo(-radius, 0);
    ctx.lineTo(radius, 0);
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1; // 改为1，与刻度线一致
    ctx.stroke();
    
    ctx.restore();
    
    // 在最后绘制固定的准星
    drawReticle();
    
    ctx.restore();
    
    // 更新数值显示
    document.getElementById('pitch-value').textContent = `${Math.round(pitch)}°`;
    document.getElementById('roll-value').textContent = `${Math.round(roll)}°`;
    document.getElementById('yaw-value').textContent = `${Math.round(yaw)}°`;
}

// 临时测试用：添加键盘控制
document.addEventListener('keydown', (e) => {
    // 这里后续可以替换为真实的数据输入逻辑
    const testStep = 5;
    
    switch(e.key) {
        case 'ArrowLeft':
            updateHeading(-testStep);
            break;
        case 'ArrowRight':
            updateHeading(testStep);
            break;
        case 'ArrowUp':
            updateAttitude(testStep, 0, 0);
            break;
        case 'ArrowDown':
            updateAttitude(-testStep, 0, 0);
            break;
        case 'q':
            updateAttitude(0, -testStep, 0);
            break;
        case 'e':
            updateAttitude(0, testStep, 0);
            break;
    }
});

let currentHeading = 0;
let currentPitch = 0;
let currentRoll = 0;
let currentYaw = 0;

function updateHeading(delta) {
    currentHeading = (currentHeading + delta + 360) % 360;
    const ctx = document.getElementById('heading-canvas').getContext('2d');
    drawHeadingIndicator(ctx, currentHeading);
    
    // Update HUD heading
    const hudHeading = document.getElementById('hud-heading');
    hudHeading.textContent = currentHeading.toString().padStart(3, '0');
}

function updateAttitude(pitchDelta, rollDelta, yawDelta) {
    currentPitch = Math.max(Math.min(currentPitch + pitchDelta, 90), -90);
    currentRoll = (currentRoll + rollDelta + 360) % 360;
    currentYaw = (currentYaw + yawDelta + 360) % 360;
    
    const ctx = document.getElementById('attitude-canvas').getContext('2d');
    drawAttitudeIndicator(ctx, currentPitch, currentRoll, currentYaw);
}

// WebRTC相关变量
let peer = null
let videoStream = null

// 初始化视频容器
const videoContainer = document.getElementById('video-stream')
const videoElement = document.createElement('video')
videoElement.autoplay = true
videoElement.muted = true // 避免回声
videoContainer.appendChild(videoElement)

// WebRTC连接处理
document.getElementById('webrtc-connect').addEventListener('click', () => {
    const config = {
        signalingUrl: document.getElementById('webrtc-signaling-url').value,
        streamId: document.getElementById('webrtc-stream-id').value
    }
    
    const statusEl = document.getElementById('webrtc-status')
    statusEl.textContent = 'Connecting...'
    statusEl.style.color = 'orange'

    // 配置ICE服务器
    const iceServers = [{
        urls: document.getElementById('webrtc-stun').value
    }]

    const turnServer = document.getElementById('webrtc-turn').value
    if (turnServer) {
        iceServers.push({
            urls: turnServer,
            username: document.getElementById('webrtc-turn-username').value,
            credential: document.getElementById('webrtc-turn-credential').value
        })
    }

    // 创建新的Peer连接
    if (peer) {
        peer.destroy()
    }

    peer = new Peer({
        initiator: false,
        trickle: true,
        config: {
            iceServers: iceServers
        }
    })

    // 处理连接事件
    peer.on('signal', data => {
        ipcRenderer.send('webrtc-signal', {
            type: 'signal',
            streamId: config.streamId,
            data: data
        })
    })

    peer.on('stream', stream => {
        videoStream = stream
        videoElement.srcObject = stream
    })

    peer.on('error', err => {
        console.error('Peer Error:', err)
        statusEl.textContent = 'Error: ' + err.message
        statusEl.style.color = 'red'
    })

    peer.on('connect', () => {
        statusEl.textContent = 'Connected'
        statusEl.style.color = 'green'
    })

    peer.on('close', () => {
        statusEl.textContent = 'Disconnected'
        statusEl.style.color = 'gray'
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop())
            videoStream = null
        }
        videoElement.srcObject = null
    })

    // 连接到信令服务器
    ipcRenderer.send('webrtc-connect', config)
})

// 处理信令服务器事件
ipcRenderer.on('webrtc-signaling-connected', () => {
    const statusEl = document.getElementById('webrtc-status')
    statusEl.textContent = 'Signaling Connected'
    statusEl.style.color = 'blue'
})

ipcRenderer.on('webrtc-signal', (event, message) => {
    if (message.type === 'signal' && peer) {
        peer.signal(message.data)
    }
})

ipcRenderer.on('webrtc-error', (event, error) => {
    const statusEl = document.getElementById('webrtc-status')
    statusEl.textContent = 'Error: ' + error
    statusEl.style.color = 'red'
})

ipcRenderer.on('webrtc-signaling-closed', () => {
    const statusEl = document.getElementById('webrtc-status')
    statusEl.textContent = 'Signaling Closed'
    statusEl.style.color = 'gray'
    if (peer) {
        peer.destroy()
        peer = null
    }
})
