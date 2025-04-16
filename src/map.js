document.addEventListener('DOMContentLoaded', () => {
    // 初始化地图
    const map = L.map('map').setView([30.5728, 114.2667], 13);
    const markers = []; // 用于存储所有标记点

    // 添加坐标转换工具
    const coordTransform = {
        PI: 3.14159265358979324,
        x_pi: 3.14159265358979324 * 3000.0 / 180.0,
        
        // WGS84 转 GCJ02
        wgs84togcj02: function(lng, lat) {
            if (this.out_of_china(lng, lat)) {
                return [lng, lat];
            }
            let dlat = this.transformlat(lng - 105.0, lat - 35.0);
            let dlng = this.transformlng(lng - 105.0, lat - 35.0);
            const radlat = lat / 180.0 * this.PI;
            let magic = Math.sin(radlat);
            magic = 1 - 0.00669342162296594323 * magic * magic;
            const sqrtmagic = Math.sqrt(magic);
            dlat = (dlat * 180.0) / ((6378245.0 * (1 - 0.006693421622966)) / (magic * sqrtmagic) * this.PI);
            dlng = (dlng * 180.0) / (6378245.0 / sqrtmagic * Math.cos(radlat) * this.PI);
            return [lng + dlng, lat + dlat];
        },
        
        transformlat: function(lng, lat) {
            let ret = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng));
            ret += (20.0 * Math.sin(6.0 * lng * this.PI) + 20.0 * Math.sin(2.0 * lng * this.PI)) * 2.0 / 3.0;
            ret += (20.0 * Math.sin(lat * this.PI) + 40.0 * Math.sin(lat / 3.0 * this.PI)) * 2.0 / 3.0;
            ret += (160.0 * Math.sin(lat / 12.0 * this.PI) + 320 * Math.sin(lat * this.PI / 30.0)) * 2.0 / 3.0;
            return ret;
        },
        
        transformlng: function(lng, lat) {
            let ret = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng));
            ret += (20.0 * Math.sin(6.0 * lng * this.PI) + 20.0 * Math.sin(2.0 * lng * this.PI)) * 2.0 / 3.0;
            ret += (20.0 * Math.sin(lng * this.PI) + 40.0 * Math.sin(lng / 3.0 * this.PI)) * 2.0 / 3.0;
            ret += (150.0 * Math.sin(lng / 12.0 * this.PI) + 300.0 * Math.sin(lng / 30.0 * this.PI)) * 2.0 / 3.0;
            return ret;
        },
        
        out_of_china: function(lng, lat) {
            return (lng < 72.004 || lng > 137.8347) || (lat < 0.8293 || lat > 55.8271);
        }
    };

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
                attribution: '© AutoNavi',
                tileSize: 256,
                zoomOffset: 0,
                tms: false,
                // 添加坐标转换
                getTileUrl: function(coords) {
                    const tileBounds = this._tileCoordsToBounds(coords);
                    const nw = tileBounds.getNorthWest();
                    const [lng, lat] = coordTransform.wgs84togcj02(nw.lng, nw.lat);
                    const converted = L.latLng(lat, lng);
                    const convertedPoint = this._map.project(converted, coords.z);
                    const convertedCoords = convertedPoint.divideBy(256).floor();
                    return L.Util.template(this._url, {
                        s: this._getSubdomain(coords),
                        x: convertedCoords.x,
                        y: convertedCoords.y,
                        z: coords.z
                    });
                }
            }),
            L.tileLayer('https://webst{s}.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scale=1&style=8', {
                subdomains: ['01', '02', '03', '04'],
                getTileUrl: function(coords) {
                    const tileBounds = this._tileCoordsToBounds(coords);
                    const nw = tileBounds.getNorthWest();
                    const [lng, lat] = coordTransform.wgs84togcj02(nw.lng, nw.lat);
                    const converted = L.latLng(lat, lng);
                    const convertedPoint = this._map.project(converted, coords.z);
                    const convertedCoords = convertedPoint.divideBy(256).floor();
                    return L.Util.template(this._url, {
                        s: this._getSubdomain(coords),
                        x: convertedCoords.x,
                        y: convertedCoords.y,
                        z: coords.z
                    });
                }
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
