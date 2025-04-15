document.addEventListener('DOMContentLoaded', () => {
    // 初始化地图
    const map = L.map('map').setView([30.5728, 114.2667], 13);
    const markers = []; // 用于存储所有标记点

    // 添加OpenStreetMap图层
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // 添加坐标显示
    const coordinatesDiv = document.getElementById('coordinates');
    
    map.on('mousemove', (e) => {
        const { lat, lng } = e.latlng;
        coordinatesDiv.textContent = `纬度: ${lat.toFixed(6)}, 经度: ${lng.toFixed(6)}`;
    });

    // 点击获取坐标
    map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        const marker = L.marker([lat, lng]).addTo(map)
            .bindPopup(`纬度: ${lat.toFixed(6)}<br>经度: ${lng.toFixed(6)}`)
            .openPopup();
        
        // 将标记点添加到数组中
        markers.push(marker);
    });

    // 清除所有标记点
    document.getElementById('clear-markers').addEventListener('click', () => {
        markers.forEach(marker => map.removeLayer(marker));
        markers.length = 0; // 清空数组
    });

    // 添加导航功能
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // 移除所有active类
            navItems.forEach(nav => nav.classList.remove('active'));
            // 添加当前active类
            item.classList.add('active');
            
            // 隐藏所有页面
            pages.forEach(page => page.classList.add('hidden'));
            // 显示目标页面
            const targetPage = document.getElementById(`${item.dataset.page}-page`);
            targetPage.classList.remove('hidden');

            // 如果切换到地图页面，触发地图resize事件
            if (item.dataset.page === 'map') {
                map.invalidateSize();
            }
        });
    });

    // 快速连接功能
    document.getElementById('quick-connect').addEventListener('click', () => {
        const hostInput = document.getElementById('quick-host').value;
        const [username, host] = hostInput.split('@');
        
        // 配置SSH连接
        const config = {
            host: host,
            username: username,
            password: '',
            port: 22
        };

        // 更新状态
        const statusEl = document.getElementById('map-ssh-status');
        statusEl.textContent = 'Connecting...';
        statusEl.style.color = 'orange';

        // 发送SSH连接请求
        ipcRenderer.send('ssh-connect', config);
        
        // 启动UDP
        ipcRenderer.send('start-udp', 14550);
    });

    // SSH状态监听
    ipcRenderer.on('ssh-connected', () => {
        const statusEl = document.getElementById('map-ssh-status');
        statusEl.textContent = 'Connected';
        statusEl.style.color = 'green';
    });

    ipcRenderer.on('ssh-error', (event, message) => {
        const statusEl = document.getElementById('map-ssh-status');
        statusEl.textContent = `Error: ${message}`;
        statusEl.style.color = 'red';
    });

    ipcRenderer.on('ssh-closed', () => {
        const statusEl = document.getElementById('map-ssh-status');
        statusEl.textContent = 'Disconnected';
        statusEl.style.color = 'gray';
    });
});
