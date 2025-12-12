// public/js/charts.js
// -------------------------------------------------------------
// Heart Track - Charts / Visualization Manager (Chart.js)
// -------------------------------------------------------------
//  - Centralizes ALL Chart.js configuration + rendering logic.
//  - Creates and manages the following charts when their
//    <canvas> elements exist on the page:
//        • heartRateChart       → Heart Rate Over Time (line)
//        • oxygenChart          → SpO₂ Over Time (line)
//        • weeklySummaryChart   → Weekly Heart Rate Summary (bar)
//        • dailyDetailChart     → Daily Detailed View (dual-axis line)
//  - Applies global Chart.js defaults so every page shares the
//    same typography, colors, tooltips, and legend styling.
//  - Exposes high-level update methods that other modules call:
//        • updateHeartRateChart(data)
//        • updateOxygenChart(data)
//        • updateWeeklySummaryChart(data)
//        • updateDailyDetailChart(data)
//    (Each expects an array of objects with timestamp,
//     heartRate, and/or bloodOxygen fields.)
//  - Includes helpers for:
//        • calculateDailyAverages() for weekly bars
//        • formatTime() / formatDate() for x-axis labels
//  - Utility controls:
//        • destroyChart(name) / destroyAllCharts()
//        • resizeChart(name)  / resizeAllCharts()
//        • exportChart(name, filename) → PNG download
//  - On DOM load, instantiates `window.chartsManager` and wires
//    a window resize listener to keep charts responsive.
// -------------------------------------------------------------


class ChartsManager {
    constructor() {
        this.charts = {};
        this.colors = {
            primary: '#e74c3c',
            secondary: '#3498db',
            success: '#27ae60',
            warning: '#f39c12',
            danger: '#e74c3c',
            info: '#17a2b8',
            light: '#ecf0f1',
            dark: '#2c3e50'
        };
        this.init();
    }

    init() {
        this.setupChartDefaults();
        this.initializeCharts();
    }

    setupChartDefaults() {
        // Set global Chart.js defaults
        Chart.defaults.font.family = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        Chart.defaults.font.size = 12;
        Chart.defaults.color = '#6c757d';
        Chart.defaults.plugins.legend.labels.usePointStyle = true;
        Chart.defaults.plugins.legend.labels.padding = 20;
    }

    initializeCharts() {
        // Initialize charts if elements exist
        this.initHeartRateChart();
        this.initOxygenChart();
        this.initWeeklySummaryChart();
        this.initDailyDetailChart();
    }

    initHeartRateChart() {
        const canvas = document.getElementById('heartRateChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        this.charts.heartRate = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Heart Rate (BPM)',
                    data: [],
                    borderColor: this.colors.primary,
                    backgroundColor: `${this.colors.primary}20`,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: this.colors.primary,
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Heart Rate Over Time',
                        font: {
                            size: 16,
                            weight: '600'
                        }
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: this.colors.primary,
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Time'
                        },
                        grid: {
                            color: '#f0f0f0'
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Heart Rate (BPM)'
                        },
                        min: 40,
                        max: 120,
                        grid: {
                            color: '#f0f0f0'
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
    }

    initOxygenChart() {
        const canvas = document.getElementById('oxygenChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        this.charts.oxygen = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Blood Oxygen (%)',
                    data: [],
                    borderColor: this.colors.secondary,
                    backgroundColor: `${this.colors.secondary}20`,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: this.colors.secondary,
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Blood Oxygen Saturation Over Time',
                        font: {
                            size: 16,
                            weight: '600'
                        }
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: this.colors.secondary,
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Time'
                        },
                        grid: {
                            color: '#f0f0f0'
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Blood Oxygen (%)'
                        },
                        suggestedMin: 80,   // let Chart.js auto-scale, but bias toward 80–100
                        suggestedMax: 100,
                        grid: {
                            color: '#f0f0f0'
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
    }

    initWeeklySummaryChart() {
        const canvas = document.getElementById('weeklySummaryChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        this.charts.weeklySummary = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Average Heart Rate',
                    data: [],
                    backgroundColor: this.colors.primary,
                    borderColor: this.colors.primary,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Weekly Heart Rate Summary',
                        font: {
                            size: 16,
                            weight: '600'
                        }
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Day of Week'
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Heart Rate (BPM)'
                        },
                        min: 50,
                        max: 100
                    }
                }
            }
        });
    }

    initDailyDetailChart() {
        const canvas = document.getElementById('dailyDetailChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        this.charts.dailyDetail = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Heart Rate (BPM)',
                        data: [],
                        borderColor: this.colors.primary,
                        backgroundColor: `${this.colors.primary}20`,
                        yAxisID: 'y',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4
                    },
                    {
                        label: 'Blood Oxygen (%)',
                        data: [],
                        borderColor: this.colors.secondary,
                        backgroundColor: `${this.colors.secondary}20`,
                        yAxisID: 'y1',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Daily Detailed View',
                        font: {
                            size: 16,
                            weight: '600'
                        }
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Time'
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Heart Rate (BPM)'
                        },
                        min: 40,
                        max: 120
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Blood Oxygen (%)'
                        },
                        suggestedMin: 80,
                        suggestedMax: 100,
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                }
            }
        });
    }

    updateHeartRateChart(data) {
        if (!this.charts.heartRate) return;

        const labels = data.map(item => this.formatTime(new Date(item.timestamp)));
        const heartRates = data.map(item => item.heartRate);

        this.charts.heartRate.data.labels = labels;
        this.charts.heartRate.data.datasets[0].data = heartRates;
        this.charts.heartRate.update('none');
    }

    updateOxygenChart(data) {
        const chart = this.charts.oxygen;
        if (!chart) return;

        // Use the same timestamp field you’re using for HR in dashboard.js
        const labels = data.map(item =>
            this.formatTime(new Date(item.timestamp || item.takenAt || item.createdAt))
        );

        const oxygenLevels = data.map(item => {
            if (typeof item.spo2 === 'number') return item.spo2;
            if (typeof item.bloodOxygen === 'number') return item.bloodOxygen;
            return null;
        });

        chart.data.labels = labels;
        chart.data.datasets[0].data = oxygenLevels;
        chart.update('none');
    }


    updateWeeklySummaryChart(data) {
        if (!this.charts.weeklySummary) return;

        const dailyAverages = this.calculateDailyAverages(data);
        
        this.charts.weeklySummary.data.datasets[0].data = dailyAverages;
        this.charts.weeklySummary.update('none');
    }

    updateDailyDetailChart(data) {
        if (!this.charts.dailyDetail) return;

        const labels = data.map(item => this.formatTime(new Date(item.timestamp)));
        const heartRates = data.map(item => item.heartRate);
        const oxygenLevels = data.map(item => item.bloodOxygen);

        this.charts.dailyDetail.data.labels = labels;
        this.charts.dailyDetail.data.datasets[0].data = heartRates;
        this.charts.dailyDetail.data.datasets[1].data = oxygenLevels;
        this.charts.dailyDetail.update('none');
    }

    calculateDailyAverages(data) {
        const dailyData = {};
        
        data.forEach(item => {
            const date = new Date(item.timestamp);
            const dayOfWeek = date.getDay();
            const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek];
            
            if (!dailyData[dayName]) {
                dailyData[dayName] = [];
            }
            dailyData[dayName].push(item.heartRate);
        });

        const averages = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
            if (dailyData[day] && dailyData[day].length > 0) {
                return dailyData[day].reduce((sum, rate) => sum + rate, 0) / dailyData[day].length;
            }
            return 0;
        });

        return averages;
    }

    formatTime(date) {
        return new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }

    formatDate(date) {
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric'
        }).format(date);
    }

    // Chart utility methods
    destroyChart(chartName) {
        if (this.charts[chartName]) {
            this.charts[chartName].destroy();
            delete this.charts[chartName];
        }
    }

    destroyAllCharts() {
        Object.keys(this.charts).forEach(chartName => {
            this.destroyChart(chartName);
        });
    }

    resizeChart(chartName) {
        if (this.charts[chartName]) {
            this.charts[chartName].resize();
        }
    }

    resizeAllCharts() {
        Object.keys(this.charts).forEach(chartName => {
            this.resizeChart(chartName);
        });
    }

    // Export chart as image
    exportChart(chartName, filename = 'chart') {
        if (this.charts[chartName]) {
            const url = this.charts[chartName].toBase64Image();
            const link = document.createElement('a');
            link.download = `${filename}.png`;
            link.href = url;
            link.click();
        }
    }

    // Add annotation to chart
    addAnnotation(chartName, annotation) {
        if (this.charts[chartName]) {
            // This would require Chart.js annotation plugin
            console.log('Annotation feature requires Chart.js annotation plugin');
        }
    }
}

// Initialize charts manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.chartsManager = new ChartsManager();
    
    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.chartsManager) {
            window.chartsManager.resizeAllCharts();
        }
    });
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChartsManager;
}
