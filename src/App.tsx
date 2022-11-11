import logo from './logo.svg';
import './App.css';
import React, { useState } from 'react';
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Chart } from 'react-chartjs-2'
import { Complex, exp, complex, multiply, add} from "mathjs"
import { Slider } from "@mui/material"

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

function hat(x : number) : number {
  if (x < - Math.PI / 2) {
    return 0
  }
  if (x < 0) {
    return x + Math.PI / 2
  }
  if (x <= Math.PI / 2) {
    return Math.PI / 2 - x
  }
  return 0
}

function coef(func, k, values) : Complex {
  const delta = values[1] - values[0]
  const L = values[values.length-1] - values[0]
  let coef : Complex = complex(0, 0)
  for (const x of values) {
    let _coef = exp(complex(0, k * x * 2 * Math.PI / L))
    _coef = multiply(_coef, complex(func(x) * delta / L, 0)) as Complex
    coef = add(coef, _coef)
  }
  return coef
}

function seriesApproximation(func, n, values) : number {
  const L = values[values.length-1] - values[0]
  return values.map((x) => {
    let res = 0
    for (let k = -n; k < n ; k++) {
      res += (multiply(coef(func, k, values), exp(complex(0, - k * x * 2 * Math.PI / L))) as Complex).re
    }
    return res
  })
}

function App() {
  const [state, setState] = useState(0)
  return <>
    <Slider min={0} max={10} onChange={(e: Event, value: any, activeThumb: number) => {setState(value)}}/>
    <Plot n={5}/>
  </>
}

function Plot(props : {n : number}) : JSX.Element {
  const nPoints = 128
  const left = -Math.PI
  const right = Math.PI
  const L = right - left

  let x = [...Array(nPoints).keys()]
  x = x.map((val) => val / nPoints * L + left)
  let y = x.map(hat)

  let approx = seriesApproximation(hat, props.n, x)

  const lineChartData = {
    labels: x,
    datasets: [
      {
        data: y,
        label: "Hat function",
        borderColor: "#3333ff",
        fill: true,
        lineTension: 0.5
      },
      {
        data: approx,
        label: "Approximation",
        borderColor: "#453456",
        fill: true,
        lineTension: 0.5
      }
    ]
  }

  return <Line
      datasetIdKey='id'
      data={lineChartData}
    />
}

export default App;
