document.addEventListener('DOMContentLoaded', () => {
    // 初始化地图
    const map = L.map('map').setView([30.5728, 114.2667], 13);
    const markers = []; // 用于存储所有标记点

    // 定义基础图层
    const baseMaps = {
        'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }),
        'Google卫星': L.tileLayer('http://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
            attribution: '© Google'
        }),
        '高德卫星': L.layerGroup([
            L.tileLayer('https://webst{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}', {
                subdomains: ['01', '02', '03', '04'],
                attribution: '© AutoNavi'
            }),
            L.tileLayer('https://webst{s}.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scale=1&style=8', {
                subdomains: ['01', '02', '03', '04']
            })
        ]),
        '地形图': L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenTopoMap'
        })
    };

    // 添加默认图层
    baseMaps['OpenStreetMap'].addTo(map);

    // 添加快速切换控件
    const MapSwitcher = L.Control.extend({
        options: { position: 'topleft' },
        onAdd: function() {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
            const buttons = [
                { name: 'OpenStreetMap', icon: '🗺️' },
                { name: 'Google卫星', icon: '🛰️' },
                { name: '高德卫星', icon: '📡' },
                { name: '地形图', icon: '⛰️' }
            ];
            
            buttons.forEach(btn => {
                const button = L.DomUtil.create('a', '', container);
                button.innerHTML = btn.icon;
                button.href = '#';
                button.title = btn.name;
                button.style.fontSize = '16px';
                button.style.textAlign = 'center';
                button.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation(); // 阻止事件冒泡
                    Object.values(baseMaps).forEach(layer => map.removeLayer(layer));
                    baseMaps[btn.name].addTo(map);
                };
            });
            
            // 防止地图缩放
            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.disableScrollPropagation(container);
            
            return container;
        }
    });
    
    new MapSwitcher().addTo(map);

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
