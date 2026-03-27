import { useState } from 'react';
import {
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
} from 'recharts';
import './BiasSpectrumChart.css';

function calcPosition(biasScore, biasedLeaning) {
    if (biasedLeaning === 'neutral') return 50;
    if (biasedLeaning === 'left') return 50 - biasScore / 2;
    if (biasedLeaning === 'right') return 50 + biasScore / 2;
    return 50;
}

function getFavicon(url) {
    try {
        const hostname = new URL(url).hostname;
        return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
    } catch {
        return null;
    }
}

// Stagger overlapping dots vertically
function computeYOffsets(points) {
    const offsets = [0, -28, 28, -56, 56];
    const result = points.map((p) => ({ ...p, y: 0 }));

    for (let i = 0; i < result.length; i++) {
        let slot = 0;
        for (let j = 0; j < i; j++) {
            if (Math.abs(result[i].x - result[j].x) < 6) {
                slot++;
            }
        }
        result[i].y = offsets[slot] ?? 0;
    }
    return result;
}

const CustomDot = (props) => {
    const { cx, cy, payload } = props;
    const [imgError, setImgError] = useState(false);
    const favicon = getFavicon(payload.url);
    const size = 32;

    if (!favicon || imgError) {
        const color = payload.leaning === 'left' ? '#5b9bd5' : payload.leaning === 'right' ? '#d55b5b' : '#aaa';
        return <circle cx={cx} cy={cy} r={12} fill={color} stroke="#222" strokeWidth={2} />;
    }

    return (
        <image
            href={favicon}
            x={cx - size / 2}
            y={cy - size / 2}
            width={size}
            height={size}
            style={{ borderRadius: '50%', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}
            onError={() => setImgError(true)}
        />
    );
};

const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const label = d.leaning === 'left' ? '⬅ Left' : d.leaning === 'right' ? '➡ Right' : '⚖ Neutral';
    return (
        <div className="spectrum-tooltip">
            <p className="tooltip-url">{d.url.replace(/^https?:\/\//, '').slice(0, 50)}</p>
            <p className="tooltip-score">Score: {d.biasScore}/100</p>
            <p className="tooltip-leaning">{label}</p>
        </div>
    );
};

function BiasSpectrumChart({ articles }) {
    const points = computeYOffsets(
        articles.map((a) => ({
            x: calcPosition(a.result.biasScore, a.result.biasedLeaning),
            url: a.url,
            biasScore: a.result.biasScore,
            leaning: a.result.biasedLeaning,
        }))
    );

    return (
        <div className="spectrum-wrapper">
            <div className="spectrum-labels">
                <span className="label-left">◀ Far Left</span>
                <span className="label-center">Center</span>
                <span className="label-right">Far Right ▶</span>
            </div>

            <div className="spectrum-chart-bg">
                <ResponsiveContainer width="100%" height={140}>
                    <ScatterChart margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
                        <XAxis
                            type="number"
                            dataKey="x"
                            domain={[0, 100]}
                            tick={false}
                            axisLine={{ stroke: '#444' }}
                            tickLine={false}
                        />
                        <YAxis
                            type="number"
                            dataKey="y"
                            domain={[-80, 80]}
                            hide
                        />
                        <Tooltip content={<CustomTooltip />} cursor={false} />
                        <ReferenceLine x={50} stroke="#555" strokeDasharray="4 4" />
                        <Scatter
                            data={points}
                            shape={<CustomDot />}
                        />
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

export default BiasSpectrumChart;
