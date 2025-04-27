setTimeout(() => {
  const wrap = document.getElementById('mini-map-wrapper');
  wrap.classList.remove('opacity-0');
  wrap.classList.add('transition-opacity', 'duration-700', 'opacity-100');

  const map = L.map('mini-map').setView([39.1653, -86.5264], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  const colorMap = {};
  const facilitiesList = [];
  const allMarkers = [];

  const baseCluster = L.markerClusterGroup();

  function generateRandomColor() {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 70%, 50%)`;
  }

  fetch('/api/facilities')
    .then(res => res.json())
    .then(data => {
      data.forEach(facility => {
        if (facility.Latitude && facility.Longitude) {
          const type = facility.Facility_Type || 'Other';
          if (!colorMap[type]) {
            colorMap[type] = generateRandomColor();
          }
          const marker = L.circleMarker([facility.Latitude, facility.Longitude], {
            radius: 6,
            fillColor: colorMap[type],
            color: 'white',
            weight: 1,
            opacity: 1,
            fillOpacity: 0.85
          })
          .bindPopup(`<b>${facility.Facility_Name}</b><br>${facility.Facility_Type}`);

          marker.facilityType = type;
          allMarkers.push(marker);
          baseCluster.addLayer(marker);

          facilitiesList.push(facility.Facility_Name);
        }
      });

      map.addLayer(baseCluster);

      // Legend
      const legend = L.control({ position: 'topright' });
      legend.onAdd = function () {
        const div = L.DomUtil.create('div', 'legend bg-white p-3 rounded-lg shadow max-h-60 overflow-y-auto');
        div.innerHTML = `<b class="text-lg mb-2 block">Facility Types</b>`;
        for (const type in colorMap) {
          div.innerHTML += `<div class="flex items-center mb-1"><div style="background:${colorMap[type]};width:12px;height:12px;margin-right:8px;border-radius:2px;"></div>${type}</div>`;
        }
        return div;
      };
      legend.addTo(map);

      // Search functionality
      const searchInput = document.getElementById('facility-search');
      const suggestionsBox = document.createElement('div');
      suggestionsBox.id = 'suggestions-box';
      suggestionsBox.className = 'absolute bg-white shadow-md rounded mt-1 max-h-48 overflow-y-auto z-50';
      searchInput.parentNode.appendChild(suggestionsBox);

      searchInput.addEventListener('input', function() {
        const searchValue = this.value.toLowerCase();
        suggestionsBox.innerHTML = '';

        if (searchValue.length === 0) {
          suggestionsBox.style.display = 'none';
          return;
        }

        const matched = facilitiesList.filter(name =>
          name.toLowerCase().includes(searchValue)
        ).slice(0, 5);

        if (matched.length > 0) {
          matched.forEach(name => {
            const div = document.createElement('div');
            div.textContent = name;
            div.className = 'p-2 hover:bg-indigo-100 cursor-pointer';
            div.onclick = function() {
              searchInput.value = name;
              suggestionsBox.innerHTML = '';
              suggestionsBox.style.display = 'none';
              const marker = allMarkers.find(m => m.getPopup().getContent().includes(name));
              if (marker) {
                map.setView(marker.getLatLng(), 16);
                marker.openPopup();
              }
            };
            suggestionsBox.appendChild(div);
          });
          suggestionsBox.style.display = 'block';
        } else {
          suggestionsBox.style.display = 'none';
        }
      });

      // Draw PieChart
      function drawSummaryChart(typeCounts) {
        const ctx = document.getElementById('pieChartCanvas').getContext('2d');
        const labels = Object.keys(typeCounts);
        const data = Object.values(typeCounts);
        const colors = labels.map(() => `hsl(${Math.random() * 360}, 70%, 60%)`);

        new Chart(ctx, {
          type: 'pie',
          data: {
            labels: labels,
            datasets: [{
              data: data,
              backgroundColor: colors,
            }]
          },
          options: {
            responsive: true,
            plugins: {
              legend: {
                display: false
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    const label = context.label || '';
                    const value = context.raw;
                    const sum = context.dataset.data.reduce((a, b) => a + b, 0);
                    const percentage = ((value / sum) * 100).toFixed(1) + '%';
                    return `${label}: ${value} (${percentage})`;
                  }
                }
              }
            }
          }
        });


      }

      function populateCustomLegend(labels, colors) {
        const legendContainer = document.getElementById('legend-list');
        legendContainer.innerHTML = '';

        labels.forEach((label, index) => {
          const li = document.createElement('li');
          li.innerHTML = `
            <span style="background-color: ${colors[index]}"></span> ${label}
          `;
          legendContainer.appendChild(li);
        });
      }

      // Toggle Sidebar Legend (optional)
      document.addEventListener('DOMContentLoaded', () => {
        const toggleButton = document.getElementById('toggle-legend-btn');
        const legendSidebar = document.getElementById('legend-sidebar');

        if (toggleButton && legendSidebar) {
          toggleButton.addEventListener('click', () => {
            legendSidebar.classList.toggle('hidden');
          });
        }
      });

      // Switch View Button
      const toggle = L.control({ position: 'bottomleft' });
      toggle.onAdd = function () {
        const div = L.DomUtil.create('div');
        div.innerHTML = `
          <button id="view-toggle-btn" class="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition">
            Switch to Summary View
          </button>
        `;
        return div;
      };
      toggle.addTo(map);

      let showingSummary = false;
      document.getElementById('view-toggle-btn').onclick = () => {
        const mapWrapper = document.getElementById('mini-map-wrapper');
        const summaryView = document.getElementById('summary-view');
        const homeButton = document.getElementById('home-button'); // ✅

        if (showingSummary) {
          mapWrapper.classList.remove('hidden');
          summaryView.classList.add('hidden');
          map.addLayer(baseCluster);
          document.getElementById('view-toggle-btn').textContent = "Switch to Summary View";

          if (homeButton) homeButton.classList.add('hidden'); // ✅ Hide Home
        } else {
          mapWrapper.classList.add('hidden');
          summaryView.classList.remove('hidden');
          map.removeLayer(baseCluster);

          const typeCounts = {};
          allMarkers.forEach(marker => {
            typeCounts[marker.facilityType] = (typeCounts[marker.facilityType] || 0) + 1;
          });
          drawSummaryChart(typeCounts);

          document.getElementById('view-toggle-btn').textContent = "Switch to Map View";

          if (homeButton) homeButton.classList.remove('hidden'); // ✅ Show Home
        }
        showingSummary = !showingSummary;
      };

    });

}, 200);
