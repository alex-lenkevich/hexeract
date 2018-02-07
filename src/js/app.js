import React from "react";
import { render } from "react-dom";
import { Provider, connect } from "react-redux";
import { createStore, combineReducers } from 'redux';
import {
    Table,
    TableBody,
    TableHeader,
    TableHeaderColumn,
    TableRow,
    TableRowColumn,
} from 'material-ui/Table';
import lightBaseTheme from 'material-ui/styles/baseThemes/lightBaseTheme';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';


// let React = require("react");
const _ = require("lodash")

const dimensionValues = {
    "date": ["01/2017", "02/2017", "03/2017", "04/2017", "05/2017", "06/2017", "07/2017", "08/2017", "09/2017", "10/2017", "11/2017", "12/2017"],
    "name": ["Sam", "John", "Met"],
    "paymentType": ["salary", "bonus", "compensation"],
    "inout": ["in", "out"],
}

const store = createStore(combineReducers({table}), {table: {
    cut: [["1", "2", "3", "1", "2", "3", "1", "2", "3", "1", "2", "3",], ["a", "b", "c", "a", "b", "c", "a", "b", "c", "a", "b", "c",]],
    cutHeaders: {
        x: ["01/2017", "02/2017", "03/2017", "04/2017", "05/2017", "06/2017", "07/2017", "08/2017", "09/2017", "10/2017", "11/2017", "12/2017"],
        y: ["Sam", "John", "Met"]
    },

    dimensions: ["date", "name", "paymentType", "inout"],
    dimensionValues,
    dimensionBeheviour: {
        "date": {type: "x"},
        "name": {type: "y"},
        "paymentType": {type: "fold", value: "sum"},
        "inout": {type: "filter", value: "out"},
    },
    data: _.flatMap(dimensionValues.date, date =>
        _.flatMap(dimensionValues.name, name =>
            _.flatMap(dimensionValues.paymentType, paymentType =>
                _.map(dimensionValues.inout, inout => {return {date, name, paymentType, inout,
                    // value: date + " " + name + " " + paymentType + " " + inout
                    value: _.random(9999) / 100
                }})
            )
        )
    )
}});
console.log(store.getState()); // 42

function table(state = 0, action) {
    switch (action.type) {
        case 'SET_DIMENSION_BEHEVIOUR':
            let newState = Object.assign({}, state)
            if (action.value.type == "x" || action.value.type == "y") {
                const conflictKey = _.findKey(newState.dimensionBeheviour, o => o.type == action.value.type)
                if (conflictKey) _.set(newState, ["dimensionBeheviour", conflictKey], {type: "filter", value: newState.dimensionValues[conflictKey][0]})
            }
            _.set(newState, ["dimensionBeheviour", action.dimension], action.value)


            const xAxis = _.findKey(newState.dimensionBeheviour, o => o.type == "x")
            const yAxis = _.findKey(newState.dimensionBeheviour, o => o.type == "y")

            _.set(newState, ["cutHeaders", "x"], newState.dimensionValues[xAxis])
            _.set(newState, ["cutHeaders", "y"], newState.dimensionValues[yAxis])

            const xAxisIndex = _.findIndex(newState.dimensions, xAxis)
            const yAxisIndex = _.findIndex(newState.dimensions, yAxis)

            let newCut = _.cloneDeep(newState.data)

            _.each(newState.dimensions, (dimension, index) => {
                const dimensionBeheviour = newState.dimensionBeheviour[dimension]
                switch (dimensionBeheviour.type) {
                    case "filter":
                        newCut = _.remove(newCut, x => x[dimension] == dimensionBeheviour.value)
                        console.log("newCut", newCut)
                        return
                    case "fold":
                        const otherDimentions = _.remove(_.cloneDeep(newState.dimensions), d => d != dimension)
                        console.log("otherDimentions", otherDimentions)
                        const grouped = _.groupBy(newCut, x => JSON.stringify(_.pick(x, otherDimentions)))
                        console.log("grouped", grouped)
                        newCut = _.map(grouped, (value, key) => Object.assign(JSON.parse(key), {value: _.reduce(value, (res, v) => {
                            switch (dimensionBeheviour.value) {
                                case "sum":
                                    return res + v.value
                            }
                        }, 0)}))
                        console.log("newCut", newCut)
                        return
                }
            })

            newCut = _.map(newState.cutHeaders.y, yVal => _.map(newState.cutHeaders.x, xVal => _.find(newCut, {[xAxis]: xVal, [yAxis]: yVal}).value))

            _.set(newState, ["cut"], newCut)

            return newState
        default: return state;
    }
}

class TableControlsElement extends React.Component {
    render() {
        const table = this.props.table
        return <div style={{display: "flex", flexDirection: "column"}}>
            {_.map(table.dimensions, (dimension) => {
               return <SelectField
                    key={dimension}
                    floatingLabelText={dimension}
                    value={JSON.stringify(table.dimensionBeheviour[dimension])}
                    onChange={(el, index, value) => {
                        this.props.dispatch({type: "SET_DIMENSION_BEHEVIOUR", dimension, value: JSON.parse(value)})
                    }}>
                    <MenuItem key="x" value={JSON.stringify({type: "x"})} primaryText="Axis: X"/>
                    <MenuItem key="y" value={JSON.stringify({type: "y"})} primaryText="Axis: Y"/>
                    <MenuItem key="sum" value={JSON.stringify({type: "fold", value: "sum"})} primaryText="Fold: Sum"/>
                    {_.map(table.dimensionValues[dimension], (value, i) =>
                        <MenuItem key="i" value={JSON.stringify({type: "filter", value})} primaryText={"Filter: " + value}/>
                    )}
                </SelectField>
            })}
        </div>
    }
}

const TableControls = connect(state => {
    return {table: state.table}
})(TableControlsElement)

class MiltiTableElement extends React.Component {
    render() {
        return <Table border="1">
                <TableHeader>
                    <TableRow>
                        <TableRowColumn key="filler">&nbsp;</TableRowColumn>
                        {_.map(this.props.table.cutHeaders.x, (value, x) =>
                            <TableRowColumn key={x}>
                                {value}
                            </TableRowColumn>
                        )}
                    </TableRow>
                </TableHeader>
            <TableBody>
            {_.map(this.props.table.cut, (row, y) =>
                <TableRow key={y}>
                    <TableRowColumn key="header">{this.props.table.cutHeaders.y[y]}</TableRowColumn>
                    {_.map(row, (value, x) =>
                        <TableRowColumn key={x}>
                            {value}
                        </TableRowColumn>
                    )}
                </TableRow>)}
            </TableBody>
        </Table>;
    }
}

const MiltiTable = connect((state, props) => {
    return {table: state.table}
})(MiltiTableElement)

render(
    <Provider store={store}>
        <MuiThemeProvider muiTheme={getMuiTheme(lightBaseTheme)}>
            <div>
                <TableControls/>
                <MiltiTable/>
            </div>
        </MuiThemeProvider>
    </Provider>,
    document.getElementById('root')
);
