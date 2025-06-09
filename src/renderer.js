const { ipcRenderer } = require('electron')
const mqtt = require('mqtt')

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
    logManager.addLog('ssh', `[SSH] ${data}`)
})

ipcRenderer.on('ssh-connected', () => {
    const statusEl = document.getElementById('ssh-status')
    statusEl.textContent = 'Connected'
    statusEl.style.color = 'green'
    logManager.addLog('ssh', '[SSH] Connected')
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
    logManager.addLog('ssh', `[SSH] Error: ${message}`)
})

ipcRenderer.on('ssh-closed', () => {
    const statusEl = document.getElementById('ssh-status')
    statusEl.textContent = 'Disconnected'
    statusEl.style.color = 'gray'
    logManager.addLog('ssh', '[SSH] Disconnected')
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

    logManager.addLog('udp', `[UDP] ${data}`)
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

// GStreamer 视频流处理
document.getElementById('gstreamer-rtp-start').addEventListener('click', () => {
    const port = document.getElementById('gstreamer-rtp-port').value || 5000;
    const pipeline = `udpsrc port=${port} caps="application/x-rtp, media=(string)video, clock-rate=(int)90000, encoding-name=(string)H264, payload=(int)96" ! rtph264depay ! decodebin ! videoconvert ! autovideosink`;
    ipcRenderer.send('gstreamer-launch', pipeline);
    document.getElementById('gstreamer-status').textContent = 'RTP Stream Starting...';
});

document.getElementById('gstreamer-rtsp-start').addEventListener('click', () => {
    const url = document.getElementById('gstreamer-rtsp-url').value;
    if (!url) {
        alert('Please enter an RTSP URL');
        return;
    }
    const pipeline = `rtspsrc location=${url} latency=0 ! rtph264depay ! decodebin ! videoconvert ! autovideosink`;
    ipcRenderer.send('gstreamer-launch', pipeline);
    document.getElementById('gstreamer-status').textContent = 'RTSP Stream Starting...';
});

document.getElementById('gstreamer-stop').addEventListener('click', () => {
    ipcRenderer.send('gstreamer-stop');
    document.getElementById('gstreamer-status').textContent = 'Stream Stopped';
});

ipcRenderer.on('gstreamer-error', (event, error) => {
    document.getElementById('gstreamer-status').textContent = `Error: ${error}`;
    logManager.addLog('gstreamer', `[GStreamer] Error: ${error}`);
});

ipcRenderer.on('gstreamer-closed', (event, code) => {
    document.getElementById('gstreamer-status').textContent = `Stream Closed (code: ${code})`;
    logManager.addLog('gstreamer', `[GStreamer] Closed with code: ${code}`);
});

ipcRenderer.on('gstreamer-stopped', () => {
    document.getElementById('gstreamer-status').textContent = 'Stream Stopped by user';
    logManager.addLog('gstreamer', '[GStreamer] Stopped by user');
});

// MQTT变量
let mqttClient = null

// MQTT消息模板验证和解析
function parseMqttMessage(message) {
    try {
        const data = JSON.parse(message)
        // 期望的数据格式:
        // {
        //     location: { lat: number, lon: number, alt: number },
        //     attitude: { pitch: number, roll: number, yaw: number },
        //     velocity: { vx: number, vy: number, vz: number },
        //     heading: number
        // }
        
        if (!data.location || !data.attitude || !data.velocity || typeof data.heading !== 'number') {
            throw new Error('Invalid message format')
        }
        
        return data
    } catch (error) {
        console.error('MQTT message parse error:', error)
        return null
    }
}

// MQTT连接处理
document.getElementById('mqtt-connect').addEventListener('click', () => {
    const brokerUrl = document.getElementById('mqtt-broker').value
    const topic = document.getElementById('mqtt-topic').value
    const username = document.getElementById('mqtt-username').value
    const password = document.getElementById('mqtt-password').value
    
    const statusEl = document.getElementById('mqtt-status')
    statusEl.textContent = 'Connecting...'
    statusEl.style.color = 'orange'
    
    // 如果已经有连接，先断开
    if (mqttClient) {
        mqttClient.end()
        mqttClient = null
    }
    
    // 创建MQTT客户端
    const options = {
        clean: true,
        connectTimeout: 4000,
        clientId: 'electron_ground_station_' + Math.random().toString(16).substr(2, 8)
    }
    
    if (username) {
        options.username = username
    }
    if (password) {
        options.password = password
    }
    
    // 处理不同的协议
    if (brokerUrl.startsWith('mqtts://')) {
        // MQTTS协议需要设置安全连接选项
        options.protocol = 'mqtts'
        options.rejectUnauthorized = false // 生产环境中应该设置为true并提供正确的CA证书
    } else if (brokerUrl.startsWith('mqtt://')) {
        options.protocol = 'mqtt'
    } else {
        // 如果用户没有指定协议，默认使用mqtt://
        console.log('没有指定MQTT协议，默认使用mqtt://')
        options.protocol = 'mqtt'
    }
    
    mqttClient = mqtt.connect(brokerUrl, options)
    
    mqttClient.on('connect', () => {
        statusEl.textContent = 'Connected'
        statusEl.style.color = 'green'
        
        // 订阅主题
        mqttClient.subscribe(topic, (err) => {
            if (err) {
                console.error('MQTT subscription error:', err)
                statusEl.textContent = 'Subscribe Error'
                statusEl.style.color = 'red'
                logManager.addLog('mqtt', `[MQTT] 订阅错误: ${err.message}`)
            } else {
                logManager.addLog('mqtt', `[MQTT] 已订阅主题: ${topic}`)
            }
        })

        logManager.addLog('mqtt', '[MQTT] Connected')
    })
    
    mqttClient.on('close', () => {
        statusEl.textContent = 'Disconnected'
        statusEl.style.color = 'gray'
        logManager.addLog('mqtt', '[MQTT] Disconnected')
    })
    
    mqttClient.on('message', (topic, message) => {
        const data = parseMqttMessage(message.toString())
        if (data) {
            logManager.addLog('mqtt', `[MQTT] ${topic}: ${JSON.stringify(data)}`)
        }
    })
    
    mqttClient.on('error', (error) => {
        console.error('MQTT Error:', error)
        statusEl.textContent = 'Error: ' + error.message
        statusEl.style.color = 'red'
        logManager.addLog('mqtt', `[MQTT] Error: ${error.message}`)
    })
    
    // 添加超时处理
    let connectTimeoutId = setTimeout(() => {
        if (mqttClient && mqttClient.connected === false) {
            statusEl.textContent = 'Connection Timeout'
            statusEl.style.color = 'red'
            logManager.addLog('mqtt', '[MQTT] Connection Timeout')
            
            // 尝试断开连接
            try {
                mqttClient.end()
            } catch (e) {
                console.error('Error disconnecting MQTT client:', e)
            }
            mqttClient = null
        }
    }, options.connectTimeout + 1000)
    
    // 清除超时的一次性函数
    const clearConnectTimeout = () => {
        if (connectTimeoutId) {
            clearTimeout(connectTimeoutId)
            connectTimeoutId = null
        }
    }
    
    // 连接成功或失败后清除超时定时器
    mqttClient.once('connect', clearConnectTimeout)
    mqttClient.once('error', clearConnectTimeout)
})

// 日志管理器
const logManager = {
    maxLogs: 1000, // 最大日志条数
    logStream: document.getElementById('log-stream'),
    activeFilters: new Set(['ssh', 'udp', 'mqtt', 'webrtc']),

    addLog(type, message, timestamp = new Date()) {
        const entry = document.createElement('div')
        entry.className = `log-entry ${type}`
        
        const timeStr = timestamp.toISOString()
        entry.innerHTML = `<span class="timestamp">${timeStr}</span>${message}`
        
        if (!this.activeFilters.has(type)) {
            entry.classList.add('hidden')
        }
        
        this.logStream.appendChild(entry)
        
        // 限制日志数量
        while (this.logStream.children.length > this.maxLogs) {
            this.logStream.removeChild(this.logStream.firstChild)
        }
        
        // 自动滚动到底部
        this.logStream.scrollTop = this.logStream.scrollHeight
    },

    clear() {
        this.logStream.innerHTML = ''
    },

    export() {
        const logs = Array.from(this.logStream.children).map(entry => {
            const timestamp = entry.querySelector('.timestamp').textContent
            const message = entry.textContent.substring(timestamp.length)
            const type = Array.from(entry.classList)
                .find(cls => ['ssh', 'udp', 'mqtt', 'webrtc'].includes(cls))
            return { timestamp, type, message }
        })

        const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `logs-${new Date().toISOString()}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    },

    toggleFilter(type) {
        if (this.activeFilters.has(type)) {
            this.activeFilters.delete(type)
            this.logStream.querySelectorAll(`.log-entry.${type}`).forEach(entry => {
                entry.classList.add('hidden')
            })
        } else {
            this.activeFilters.add(type)
            this.logStream.querySelectorAll(`.log-entry.${type}`).forEach(entry => {
                entry.classList.remove('hidden')
            })
        }
    }
}

// 初始化日志控制
document.getElementById('clear-logs').addEventListener('click', () => logManager.clear())
document.getElementById('export-logs').addEventListener('click', () => logManager.export())

document.querySelectorAll('.log-filters input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
        logManager.toggleFilter(e.target.dataset.type)
    })
})
