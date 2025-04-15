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
});
