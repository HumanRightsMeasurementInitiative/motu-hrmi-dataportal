import React from 'react'
import PropTypes from 'prop-types'
import * as d3 from 'd3'
import { get } from 'lodash'

const COLORS = {
  food: '#009540',
  education: '#00af49',
  health: '#00c852',
  housing: '#00d556',
  work: '#00e25b',
  'freedom-from-disappearance': '#51c9f0',
  'freedom-from-arbitrary-arrest': '#46b3e0',
  'freedom-from-execution': '#3c9dd1',
  'freedom-from-torture': '#3187c1',
  'participate-in-government': '#2e65a1',
  'assembly-and-association': '#2a4482',
  'opinion-and-expression': '#262262',
}

export default class GeoMiniBarChart extends React.Component {
  static propTypes = {
    height: PropTypes.number.isRequired,
    data: PropTypes.object.isRequired,
    right: PropTypes.string.isRequired,
    isESR: PropTypes.bool.isRequired,
    hoverCountry: PropTypes.string,
    esrStandard: PropTypes.string,
    isWithDot: PropTypes.bool,
    pointColor: PropTypes.string,
  }

  static defaultProps = {
    isWithDot: false,
  }

  constructor() {
    super()
    this.state = { containerWidth: 0 }
  }

  componentDidMount() {
    this.fitContainer()
    window.addEventListener('resize', this.fitContainer)
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.fitContainer)
  }

  fitContainer = () => {
    const currentWidth = this.refs.chartContainer.offsetWidth
    const shouldResize = this.state.containerWidth !== currentWidth
    if (shouldResize) {
      this.setState({ containerWidth: currentWidth })
    }
  }

  render() {
    const { height, data, right, esrStandard, hoverCountry, isESR, isWithDot, pointColor } = this.props
    const { containerWidth } = this.state
    const margin = { top: isWithDot ? 14 : 4, right: 0, bottom: 4, left: 14 }
    const barX = d3
      .scaleLinear()
      .domain([0, data.countries.length - 1])
      .range([margin.left + 20, containerWidth - 20])
    const cprHeight = d3
      .scaleLinear()
      .domain([0, 10])
      .range([0, height - margin.top - margin.bottom])
    const esrHeight = d3
      .scaleLinear()
      .domain([0, 100])
      .range([0, height - margin.top - margin.bottom])

    const barWidth = containerWidth
      ? (containerWidth - margin.left) / data.countries.length * 0.6
      : 0

    const getRightValue = country =>
      isESR
        ? get(country, `rights.${esrStandard}.${right}`, 0)
        : get(country, `rights.cpr.${right}.mean`, 0)
    const sortedCountries = data.countries.slice().sort((a, b) => getRightValue(a) - getRightValue(b))

    return (
      <div ref="chartContainer">
        <svg height={height} width={containerWidth}>
          <g>
            <text x="0" y={isWithDot ? 18 : 8} fontSize="10px" fill="#ddd">
              {esrStandard ? '100%' : '10'}
            </text>
            <line
              x1={esrStandard ? margin.left + 5 : margin.left}
              y1={margin.top}
              x2={containerWidth}
              y2={margin.top}
              stroke="#ddd"
            />
            <text x="4" y={height - 2} fontSize="10px" fill="#ddd">
              {esrStandard ? '0%' : '0'}
            </text>
            <line
              x1={esrStandard ? margin.left + 5 : margin.left}
              y1={height - margin.bottom}
              x2={containerWidth}
              y2={height - margin.bottom}
              stroke="#bdbdbd"
            />
          </g>
          {sortedCountries.map((country, i) => {
            const esrValue =
              esrStandard && country.rights[esrStandard] ? country.rights[esrStandard][right] : 0
            const cprValue = !esrStandard && country.rights.cpr ? country.rights.cpr[right].mean : 0
            const value = esrStandard ? esrHeight(esrValue) : cprHeight(cprValue)
            const x = value ? barX(i) : 0
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={height - value - margin.bottom}
                  height={Math.round(value)}
                  width={barWidth}
                  fill={hoverCountry === country.countryCode ? COLORS[right] : '#ddd'}
                />
                { isWithDot && Math.round(value) &&
                <circle cx={x + barWidth / 2} cy={height - value - margin.bottom} r={barWidth / 2} fill={pointColor}></circle>
                }
              </g>
            )
          })}
        </svg>
      </div>
    )
  }
}
