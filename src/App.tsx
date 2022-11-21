import './App.css';
import { observer } from "mobx-react-lite"
import React, { useState, useContext } from 'react';
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
  LogarithmicScale,
} from 'chart.js'
import { Chart } from 'react-chartjs-2'
import { Complex, exp, complex, multiply, add, abs, sqrt} from "mathjs"
import { FormControl, FormControlLabel, FormLabel, Radio, RadioGroup, Slider, SliderThumb } from "@mui/material"
import { fft } from "fft-js"
import { jsx } from '@emotion/react';
import { action, makeObservable, observable } from 'mobx';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LogarithmicScale,
  Title,
  Tooltip,
  Legend
)

class Function {
    func : (x : number) => number
    nPoints : number
    left : number
    right : number
    points : number[]
    values : number[]
    frequency : number

    coefs : Record<number, Complex>
    approximations : Record<number, number[]>

    constructor(func : (x : number) => number, frequency : number, nPoints : number) {
        this.func = func
        this.nPoints = nPoints
        this.left = - Math.PI
        this.right = Math.PI
        this.frequency = frequency

        const pointsPerInterval = nPoints * frequency

        this.points = [...Array(pointsPerInterval).keys()].map((val) => (val % nPoints) * (this.right - this.left) / nPoints + this.left)
        this.values = this.points.map(func)

        this.coefs = Object.assign(
            {}, ...[...Array(this.nPoints).keys()].map(
                (x) => ({[x - Math.floor(this.nPoints / 2)]: this.fourierCoefficient(x - Math.floor(this.nPoints / 2))})
            )
        )

        this.approximations = {}

        console.log('Compute approximations')
        this.approximations[0] = this.fourierHarmonic(0)

        for (let k=1; k < Math.floor(this.nPoints / 2); k++) {
            const harmonic_pos = this.fourierHarmonic(k)
            const harmonic_neg = this.fourierHarmonic(-k)
            this.approximations[k] = [...Array(pointsPerInterval).keys()].map((x) =>
                this.approximations[k-1][x % nPoints] + harmonic_pos[x % nPoints] + harmonic_neg[x % nPoints]
            )
        }

    }

    // fft() {
    //     console.log(fft(this.values))
    // }

    fourierCoefficient(k : number) : Complex {
        const L = this.right - this.left
        const delta = (this.right - this.left) / this.nPoints
        let coef : Complex = complex(0, 0)

        for (const x of this.points) {
          let _coef = exp(complex(0, k * x * 2 * Math.PI / L))
          _coef = multiply(_coef, complex(this.func(x) * delta / L, 0)) as Complex // TODO: remove this.func
          _coef = multiply(sqrt(1 / this.frequency), _coef) as Complex
          coef = add(coef, _coef)
        }
        return coef
    }

    fourierHarmonic(k : number) : number[] {
        return this.points.map((x) => {
                return 1 / Math.sqrt(this.frequency) * (multiply(this.coefs[k] as Complex, exp(complex(0, - k * x * 2 * Math.PI / (this.right - this.left)))) as Complex).re
            })
    }
}

export class AppContextType {
    functions : Array<(x : number) => number>
    nPoints : number
    funcIndex : number
    func : Function

    constructor() {
        this.nPoints = 1024
        this.functions = [triangle, square, linear, Math.sin, Math.cos]

        makeObservable(this, {
            funcIndex : observable,
            func : observable,
            setFunc : action,
            setFrequency : action
        })

        this.setFunc(0)
    }

    setFunc(funcIndex : number) {
        this.funcIndex = funcIndex
        this.func = new Function(this.functions[funcIndex], 1, this.nPoints)
    }

    setFrequency(frequency : number) {
        this.func = new Function(this.functions[this.funcIndex], frequency, this.nPoints)
    }
}


interface AppContextProps {
    children : React.ReactNode,
}

export const AppContext = React.createContext({} as AppContextType);

export const AppContextProvider = (props: AppContextProps) : JSX.Element => {
    const [state, _] = useState(() => new AppContextType())

    return (
    <AppContext.Provider value={state}>
        {props.children}
    </AppContext.Provider>
    )
}

function triangle(x : number) : number {
    if (x < 0) {
        return x + Math.PI
    }
    else {
        return Math.PI - x
    }
}

function square(x : number) : number {
    if (x < - Math.PI / 2) {
        return -Math.PI
    }
    if (x <= Math.PI / 2) {
        return Math.PI
    }
    return 0
}

function linear(x : number) : number {
    return x
}

function App() {
  return  <AppContextProvider>
        <FunctionRadioGroup />
        <ViewPort />
    </AppContextProvider>
}

function FunctionRadioGroup() {
    const context = useContext(AppContext)

    return <FormControl>
        <FormLabel id="demo-radio-buttons-group-label">Function</FormLabel>
        <RadioGroup
            aria-labelledby="demo-radio-buttons-group-label"
            defaultValue="0"
            name="radio-buttons-group"
            onChange={(event) => {context.setFunc(Number(event.target.value))}}
        >
            <FormControlLabel value='0' control={<Radio />} label="triangle" />
            <FormControlLabel value='1' control={<Radio />} label="square" />
            <FormControlLabel value='2' control={<Radio />} label="linear" />
            <FormControlLabel value='3' control={<Radio />} label="sin" />
            <FormControlLabel value='4' control={<Radio />} label="cos" />
        </RadioGroup>
        </FormControl>
}

const Sound = observer((): JSX.Element => {
    const context = useContext(AppContext)

    var audioContext = new AudioContext()
    var gainNode = audioContext.createGain()
    gainNode.gain.value = 0.1 // 10 %
    gainNode.connect(audioContext.destination)

    var o = audioContext.createOscillator()

    const real = [...Array(context.func.nPoints / 2).keys()].map((x) => 2 * context.func.coefs[x].re)
    const imag = [...Array(context.func.nPoints / 2).keys()].map((x) => - 2 * context.func.coefs[x].im)

    const wave = new PeriodicWave(audioContext, {
        real,
        imag,
        disableNormalization: false,
      });

    o.setPeriodicWave(wave)
    o.connect(gainNode)

    o.start(1)
    o.stop(5)

    return <>
    </>
})

const ViewPort = observer((): JSX.Element => {
    const context = useContext(AppContext)
    const [nCoefs, setNCoefs] = useState(0)
    return <>
        <Sound/>
        <Slider min={1} max={10} onChange={(e: Event, value: any, activeThumb: number) => {context.setFrequency(value)}}/>
        <Slider min={0} max={context.func.nPoints / 2 - 1} onChange={(e: Event, value: any, activeThumb: number) => {setNCoefs(value)}}/>
        <Plot nCoefs={nCoefs}/>
    </>
})

const Plot = observer((props : {nCoefs : number}): JSX.Element => {
    const context = useContext(AppContext)

    const lineChartData = {
        labels: context.func.points,
        datasets: [
            {
                data: context.func.values,
                label: "Target function",
                borderColor: "#3333ff",
                fill: true,
                lineTension: 0.5,
            },
            {
                data: context.func.approximations[props.nCoefs],
                label: "Approximation",
                borderColor: "#453456",
                fill: true,
                lineTension: 0.5
            }
        ],
    }

    const coefsPoints = [...Object.keys(context.func.coefs)].sort((a, b) => Number(a) > Number(b) ? 1 : -1)
    const coefsData = {
        labels: coefsPoints,
        datasets: [
            {
                data: coefsPoints.map(x => context.func.coefs[x].re),
                label: "Re",
                borderColor: "#0000ff",
            },
            {
                data: coefsPoints.map(x => context.func.coefs[x].im),
                label: "Im",
                borderColor: "#ff0000",
            },
            {
                data: coefsPoints.map(x => Math.pow(abs(context.func.coefs[x]), 2)),
                label: "Energy",
                borderColor: "#00ff00",
            }
        ]
    }

    const diffData = {
        labels: context.func.points,
        datasets: [
            {
                data: [...Array(context.func.points.length).keys()].map(x => {
                    return Math.abs(context.func.values[x] - context.func.approximations[props.nCoefs][x])
                }),
                label: "Diff",
                borderColor: "#0000ff",
            }
        ]
    }

    return <div className="row">
        <div style={{float: 'left', height: '750px', width: '650px'}}>
        <Line
            datasetIdKey='function'
            data={lineChartData}
            options={{animation: false,
                borderWidth: 1, 
                elements : {
                    point : {
                        radius : 0
                    }},
                    scales: {
                        x: {
                            ticks: {
                                callback: function (value, index, ticks) {
                                    return Number(value).toFixed(2)
                                }
                            }
                        },
                        y: {
                            max: 3.5,
                            min: -3.5,
                            ticks: {
                                callback: function (value : number | string) {
                                    return Number(value).toFixed(2)
                                }
                            }
                        }
                    }
            }}
        />
        </div>
        <div style={{float: 'left', width: '650px'}}>
        <Line
            datasetIdKey='Coefs'
            data={coefsData}
            options={{animation: false, 
                borderWidth: 1, 
                elements : {
                point : {
                    radius : 0
                }},
                // scales: {
                //     y: {
                //         display: true,
                //         type: 'logarithmic',
                //     }
                // }
            }}
        />
        </div>
        <div style={{float: 'left', width: '650px'}}>
        <Line
            datasetIdKey='Diff'
            data={diffData}
            options={{animation: false,
                borderWidth: 0.5, 
                elements : {
                    point : {
                        radius : 0
                    }},
                    scales: {
                        y: {
                            display: true,
                            type: 'logarithmic',
                        }
                    }
                }
            }
        />
        </div>
    </div>
})

export default App;
