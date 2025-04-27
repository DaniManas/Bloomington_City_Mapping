L.MarkerClusterGroup.include({
  _generateInitialLayersArray: function () {
    return [];
  }
});

L.MarkerClusterGroup.PieChart = L.MarkerClusterGroup.extend({

  options: {
    chartOptions: {
      size: 50,
      className: 'piechart-cluster',
      tooltip: ''
    }
  },

  initialize: function (options) {
    L.MarkerClusterGroup.prototype.initialize.call(this, options);
  },

  _generateInitialLayersArray: function () {
    return [];
  },

  _childMarkerCluster: function (childClusters) {
    var counts = {};
    var children = [];

    childClusters.forEach(function (child) {
      if (child._markers) {
        children = children.concat(child._markers);
      }
    });

    children.forEach(function (marker) {
      var type = marker.facilityType || 'Other';
      counts[type] = (counts[type] || 0) + 1;
    });

    return counts;
  },

  _createClusterIcon: function (cluster) {
    var childCounts = this._childMarkerCluster(cluster.getAllChildMarkers());

    var data = [];
    for (var type in childCounts) {
      data.push({ label: type, count: childCounts[type] });
    }

    var total = data.reduce(function (sum, d) { return sum + d.count; }, 0);

    var pie = this._drawPieChart(data, total);

    var div = document.createElement('div');
    div.innerHTML = pie;

    var icon = new L.DivIcon({
      html: div,
      className: this.options.chartOptions.className,
      iconSize: new L.Point(this.options.chartOptions.size, this.options.chartOptions.size)
    });

    return icon;
  },

  _drawPieChart: function (data, total) {
    var size = this.options.chartOptions.size;
    var radius = size / 2;
    var colors = [
      '#66c2a5', '#fc8d62', '#8da0cb',
      '#e78ac3', '#a6d854', '#ffd92f',
      '#e5c494', '#b3b3b3'
    ];

    var cumulativePercent = 0;

    function getCoordinatesForPercent(percent) {
      var x = Math.cos(2 * Math.PI * percent);
      var y = Math.sin(2 * Math.PI * percent);
      return [x, y];
    }

    var slices = data.map(function (d, i) {
      var [startX, startY] = getCoordinatesForPercent(cumulativePercent);
      cumulativePercent += d.count / total;
      var [endX, endY] = getCoordinatesForPercent(cumulativePercent);

      var largeArcFlag = d.count / total > 0.5 ? 1 : 0;

      return `
        <path d="M ${radius} ${radius}
          L ${radius + startX * radius} ${radius + startY * radius}
          A ${radius} ${radius} 0 ${largeArcFlag} 1 ${radius + endX * radius} ${radius + endY * radius}
          Z"
          fill="${colors[i % colors.length]}">
        </path>
      `;
    }).join('');

    return `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        ${slices}
        <circle cx="${radius}" cy="${radius}" r="${radius * 0.5}" fill="white" />
        <text x="50%" y="55%" text-anchor="middle" fill="black" font-size="12" font-weight="bold">${total}</text>
      </svg>
    `;
  }
});

L.markerClusterGroup.piechart = function (options) {
  return new L.MarkerClusterGroup.PieChart(options);
};
