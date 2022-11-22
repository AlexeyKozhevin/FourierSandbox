import './App.css';
import { observer } from "mobx-react-lite"
import React, { useState, useContext, useEffect } from 'react';
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
import { Complex, exp, complex, multiply, add, abs } from "mathjs"
import { FormControl, FormControlLabel, FormLabel, Radio, RadioGroup, Slider, Typography } from "@mui/material"
import { action, makeObservable, observable } from 'mobx';
import Grid from '@mui/material/Grid';

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

        
        makeObservable(this, {
            frequency : observable,
            setFrequency : action
        })

        this.points = [...Array(nPoints).keys()].map((val) => val * (this.right - this.left) / nPoints + this.left)
        this.values = this.points.map(func)

        this.coefs = Object.assign(
            {}, ...[...Array(this.nPoints).keys()].map(
                (x) => ({[x - Math.floor(this.nPoints / 2)]: this.fourierCoefficient(x - Math.floor(this.nPoints / 2))})
            )
        )

        this.approximations = {}

        this.approximations[0] = this.fourierHarmonic(0)

        for (let k=1; k < Math.floor(this.nPoints / 2); k++) {
            const harmonic_pos = this.fourierHarmonic(k)
            const harmonic_neg = this.fourierHarmonic(-k)
            this.approximations[k] = [...Array(nPoints).keys()].map((x) =>
                this.approximations[k-1][x] + harmonic_pos[x] + harmonic_neg[x]
            )
        }

    }

    fourierCoefficient(k : number) : Complex {
        const L = this.right - this.left
        const delta = (this.right - this.left) / this.nPoints
        let coef : Complex = complex(0, 0)

        for (const x of this.points) {
          let _coef = exp(complex(0, k * x * 2 * Math.PI / L))
          _coef = multiply(_coef, complex(this.func(x) * delta / L, 0)) as Complex // TODO: remove this.func
          coef = add(coef, _coef)
        }
        return coef
    }

    fourierHarmonic(k : number) : number[] {
        return this.points.map((x) => {
                return (multiply(this.coefs[k] as Complex, exp(complex(0, - k * x * 2 * Math.PI / (this.right - this.left)))) as Complex).re
            })
    }

    getPoints() : [number[], number[]] {
        const pointPerInterval = Math.ceil(this.nPoints * this.frequency)
        const points = [...Array(pointPerInterval).keys()].map((val) => val * (this.right - this.left) / pointPerInterval + this.left)
        const values = [...Array(pointPerInterval).keys()].map((val) => (val % this.nPoints) * (this.right - this.left) / this.nPoints + this.left).map((x) => this.func(x % this.nPoints))
        return [points, values]
    }

    getApproximation(k: number) : number[] {
        const pointPerInterval = Math.ceil(this.nPoints * this.frequency)
        const values = [...Array(pointPerInterval).keys()].map((x) => this.approximations[k][x % this.nPoints])
        return values
    }

    getCoefs() : Record<number, Complex> {
        return this.coefs
        // const nPoints = Math.ceil(this.nPoints * this.frequency)
        // return Object.assign(
        //     {}, ...[...Array(nPoints).keys()].map(
        //         (x) => ({[x - Math.floor(nPoints / 2)]:
        //             (x  - Math.floor(nPoints / 2)) % this.frequency === 0
        //             ? this.coefs[(x - Math.floor(nPoints / 2)) / this.frequency]
        //             : complex(0, 0)
        //         })
        //     )
        // )
    }

    setFrequency(frequency : number) : void {
        this.frequency = frequency
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
            setFunc : action
        })

        this.setFunc(0)
    }

    setFunc(funcIndex : number) {
        this.funcIndex = funcIndex
        this.func = new Function(this.functions[funcIndex], this.func ? this.func.frequency : 1, this.nPoints)
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
    if (x < 0) {
        return -Math.PI
    }
    else {
        return Math.PI
    }
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
            <Grid alignItems="center">
            <FormControlLabel value='0' control={<Radio />} label="triangle" />
            <FormControlLabel value='1' control={<Radio />} label="square" />
            <FormControlLabel value='2' control={<Radio />} label="linear" />
            <FormControlLabel value='3' control={<Radio />} label="sin" />
            <FormControlLabel value='4' control={<Radio />} label="cos" />
            </Grid>
        </RadioGroup>
        </FormControl>
}

function makeSound(coefs : any, nCoefs : number, frequency : number) {
    var audioContext = new AudioContext()
    var gainNode = audioContext.createGain()
    gainNode.gain.value = 0.02 // 10 %
    gainNode.connect(audioContext.destination)

    var o = audioContext.createOscillator()

    const real = [...Array(nCoefs < 2 ? 2 : nCoefs).keys()].map((x) => 2 * coefs[x].re)
    const imag = [...Array(nCoefs < 2 ? 2 : nCoefs).keys()].map((x) => - 2 * coefs[x].im)

    console.log(real, imag)

    const wave = new PeriodicWave(audioContext, {
        real,
        imag,
        disableNormalization: false,
    });

    o.frequency.setValueAtTime(440 * frequency, audioContext.currentTime)
    o.setPeriodicWave(wave)
    o.connect(gainNode)
    o.start(0)
    o.stop(3)
}

const Sound = observer((props: {nCoefs : number}): JSX.Element => {
    const context = useContext(AppContext)
    const nCoefs = props.nCoefs
    const coefs = context.func.getCoefs()

    return <button onClick={() => {makeSound(coefs, nCoefs, context.func.frequency)}}> Sound </button>
})

const ViewPort = observer((): JSX.Element => {
    const context = useContext(AppContext)
    const [nCoefs, setNCoefs] = useState(10)

    return <>
        <Sound nCoefs={nCoefs}/>
        <Grid container spacing={2} alignItems="center">
            <Grid item xs={1.5}>
                <Typography>
                    Frequency: {Math.ceil(440 * context.func.frequency)} Hz
                </Typography>
            </Grid>
            <Grid item xs={3}><Slider 
                min={0.5} max={5} step={0.1}
                defaultValue={1}
                onChange={(e: Event, value: any, activeThumb: number) => {context.func.setFrequency(value)}}
                valueLabelDisplay="auto"
                valueLabelFormat={() => Math.ceil(440 * context.func.frequency) + ' Hz'}
            /></Grid>
        </Grid>
        <Grid container spacing={3} alignItems="center">
            <Grid  item xs={1.5}>
                <Typography>
                    Number of harmonics: {nCoefs}
                </Typography>
            </Grid>
            <Grid item xs={3}>
                <Slider
                    min={0} max={context.func.nPoints / 2 - 1}
                    value={nCoefs}
                    valueLabelDisplay="auto"
                    onChange={(e: Event, value: any, activeThumb: number) => {setNCoefs(value)}}/>
            </Grid>
        </Grid>
        <Plot nCoefs={nCoefs}/>
    </>
})

const Plot = observer((props : {nCoefs : number}): JSX.Element => {
    const context = useContext(AppContext)

    const [points, values] = context.func.getPoints()
    const approximation = context.func.getApproximation(props.nCoefs)
    const coefs = context.func.getCoefs()

    const lineChartData = {
        labels: points,
        datasets: [
            {
                data: values,
                label: "Target function",
                borderColor: "#3333ff",
                fill: true,
                lineTension: 0.5,
            },
            {
                data: approximation,
                label: "Approximation",
                borderColor: "#453456",
                fill: true,
                lineTension: 0.5
            }
        ],
    }

    const coefsPoints = [...Array(2 * props.nCoefs).keys()].map((x) => x - props.nCoefs)
    const coefsData = {
        labels: coefsPoints,
        datasets: [
            {
                data: coefsPoints.map(x => coefs[x].re),
                label: "Re",
                borderColor: "#0000ff",
            },
            {
                data: coefsPoints.map(x => coefs[x].im),
                label: "Im",
                borderColor: "#ff0000",
            },
            {
                data: coefsPoints.map(x => Math.pow(abs(coefs[x]), 2)),
                label: "Energy",
                borderColor: "#00ff00",
            }
        ]
    }

    const diffData = {
        labels: context.func.points,
        datasets: [
            {
                data: [...Array(context.func.nPoints).keys()].map(x => {
                    return Math.abs(context.func.approximations[props.nCoefs][x] - context.func.values[x])
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
                        // x: {
                        //     ticks: {
                        //         callback: function (value, index, ticks) {
                        //             return Number(value).toFixed(2)
                        //         }
                        //     }
                        // },
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
