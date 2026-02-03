import { useState } from 'react';
import { BarChart3, Plus, Trash2, Download, Copy } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import { useStore } from '../store/useStore';
import { ChartData } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const generateId = () => Math.random().toString(36).substring(2, 15);

const defaultColors = [
  'rgba(14, 165, 233, 0.7)',
  'rgba(168, 85, 247, 0.7)',
  'rgba(34, 197, 94, 0.7)',
  'rgba(249, 115, 22, 0.7)',
  'rgba(239, 68, 68, 0.7)',
  'rgba(236, 72, 153, 0.7)',
];

export const Charts = () => {
  const { charts, addChart, deleteChart, currentArticle } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [chartTitle, setChartTitle] = useState('');
  const [chartType, setChartType] = useState<ChartData['type']>('bar');
  const [labelsInput, setLabelsInput] = useState('');
  const [dataInput, setDataInput] = useState('');
  const [datasetLabel, setDatasetLabel] = useState('');

  const handleCreate = () => {
    const labels = labelsInput.split(',').map((l) => l.trim());
    const data = dataInput.split(',').map((d) => parseFloat(d.trim()));

    if (labels.length === 0 || data.length === 0) return;

    const newChart: ChartData = {
      id: generateId(),
      title: chartTitle || 'Untitled Chart',
      type: chartType,
      data: {
        labels,
        datasets: [
          {
            label: datasetLabel || 'Data',
            data,
            backgroundColor: chartType === 'line' ? 'rgba(14, 165, 233, 0.2)' : defaultColors,
            borderColor: 'rgba(14, 165, 233, 1)',
          },
        ],
      },
      articleId: currentArticle?.id,
    };

    addChart(newChart);
    resetForm();
  };

  const resetForm = () => {
    setChartTitle('');
    setChartType('bar');
    setLabelsInput('');
    setDataInput('');
    setDatasetLabel('');
    setShowForm(false);
  };

  const copyChartAsImage = async (chartId: string) => {
    const canvas = document.querySelector(`#chart-${chartId} canvas`) as HTMLCanvasElement;
    if (canvas) {
      canvas.toBlob((blob) => {
        if (blob) {
          navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ]);
        }
      });
    }
  };

  const downloadChart = (chartId: string, title: string) => {
    const canvas = document.querySelector(`#chart-${chartId} canvas`) as HTMLCanvasElement;
    if (canvas) {
      const link = document.createElement('a');
      link.download = `${title.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  const renderChart = (chart: ChartData) => {
    const options = {
      responsive: true,
      plugins: {
        legend: { position: 'top' as const },
        title: { display: true, text: chart.title },
      },
    };

    switch (chart.type) {
      case 'line':
        return <Line data={chart.data} options={options} />;
      case 'bar':
        return <Bar data={chart.data} options={options} />;
      case 'pie':
        return <Pie data={chart.data} options={options} />;
      case 'doughnut':
        return <Doughnut data={chart.data} options={options} />;
      default:
        return <Bar data={chart.data} options={options} />;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="text-green-500" size={24} />
          <h2 className="text-xl font-semibold text-slate-800">Data Charts</h2>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
        >
          <Plus size={18} />
          New Chart
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border-b border-slate-200 p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Chart Title
              </label>
              <input
                type="text"
                value={chartTitle}
                onChange={(e) => setChartTitle(e.target.value)}
                placeholder="e.g., Q4 Revenue Growth"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Chart Type
              </label>
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value as ChartData['type'])}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="bar">Bar Chart</option>
                <option value="line">Line Chart</option>
                <option value="pie">Pie Chart</option>
                <option value="doughnut">Doughnut Chart</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Dataset Label
            </label>
            <input
              type="text"
              value={datasetLabel}
              onChange={(e) => setDatasetLabel(e.target.value)}
              placeholder="e.g., Revenue (millions)"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Labels (comma-separated)
            </label>
            <input
              type="text"
              value={labelsInput}
              onChange={(e) => setLabelsInput(e.target.value)}
              placeholder="e.g., Jan, Feb, Mar, Apr, May"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Data Values (comma-separated)
            </label>
            <input
              type="text"
              value={dataInput}
              onChange={(e) => setDataInput(e.target.value)}
              placeholder="e.g., 12, 19, 3, 5, 2"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              Create Chart
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {charts.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <BarChart3 className="mx-auto mb-4 opacity-50" size={48} />
            <p>No charts yet. Create one to visualize your data!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {charts.map((chart) => (
              <div
                key={chart.id}
                id={`chart-${chart.id}`}
                className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm"
              >
                <div className="mb-4">{renderChart(chart)}</div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => copyChartAsImage(chart.id)}
                    className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                    title="Copy as image"
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    onClick={() => downloadChart(chart.id, chart.title)}
                    className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                    title="Download"
                  >
                    <Download size={16} />
                  </button>
                  <button
                    onClick={() => deleteChart(chart.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
