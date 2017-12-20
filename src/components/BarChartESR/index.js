import React from 'react'
import PropTypes from 'prop-types'
import * as d3 from 'd3'

export default class BarChartESR extends React.Component {
  static propTypes = {
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
    data: PropTypes.array.isRequired,
  }

  render() {
    const { width, height, data } = this.props
    const axis = [
      { height: 0.2 * height, text: '100%' },
      { height: 0.5 * height, text: '50%' },
      { height: 0.8 * height, text: '0%' },
    ]
    const bars = data.map((right, index) => {
      const x = width / 5 * (index + 1) - 0.05 * width
      const rectHeight = d3.scaleLinear().range([0, 0.6 * height]).domain([0, 100])
      return <rect key={index} x={x} y={0.8 * height - rectHeight(right.value)} width={0.05 * width} height={rectHeight(right.value)} fill="#2E65A1"/>
    })
    return (
      <svg width={width} height={height}>
        {axis.map((line, index) => {
          if (index < 2) {
            return (
              <g key={index}>
                <text x="0" y={line.height - 2}>{line.text}</text>
                <line x1="0" y1={line.height} x2={width} y2={line.height} stroke="#2E65A1" opacity="0.25"></line>
              </g>
            )
          } else {
            return (
              <g key={index}>
                <text x="0" y={line.height - 2}>{line.text}</text>
                <line key={index} x1="0" y1={line.height} x2={width} y2={line.height} stroke="#2E65A1"></line>
              </g>
            )
          }
        })}
        {bars}
      </svg>
    )
  }
}