function initGlobalVariables() {
    let cluster_num = Object.keys(labelToClass).length;
    change_distance = new Array(cluster_num).fill(0);
}

function loadScatterplotExample() {
    source_datasets = [];
    source_datasets_names = [];
    d3.text("./data/teaser-top.csv", function (error, text) {
        if (error) throw error;
        DATATYPE = "SCATTERPLOT";
        source_datasets_names.push("teaser-top");
        let labelSet = new Set();
        if (!loadData(text, labelSet, "teaser-top")) {
            console.log("Loading file problem.");
            return
        }

        labelToClass = getLabelToClassMapping(labelSet);
        initGlobalVariables();
        change_distance[5] = 1;
        processScatterData(source_datasets);
        d3.select(".operationDiv").style('pointer-events', "auto");
        document.querySelector('#loading').classList.add('hide');
        data_changed_sign = true;
        if (generation_mode === 0) {
            document.getElementById("slider_1").value = 100;
            changeSlider("inputBox_nd", document.getElementById("slider_1").value)
            document.getElementById("slider_2").value = 0;
            changeSlider("inputBox_cd", document.getElementById("slider_2").value)
        }
        renderResult();
    });
}

function loadLinechartExample() {
    source_datasets = [];
    source_datasets_names = [];
    d3.text("./data/linechart-0.csv", function (error, text) {
        if (error) throw error;
        DATATYPE = "LINECHART";
        source_datasets_names.push("linechart-0");
        let labelSet = new Set();
        if (!loadData(text, labelSet, "linechart-0")) {
            console.log("Loading file problem.");
            return
        }

        labelToClass = getLabelToClassMapping(labelSet);
        initGlobalVariables();

        processLineData(source_datasets);
        d3.select(".operationDiv").style('pointer-events', "auto");
        document.querySelector('#loading').classList.add('hide');
        data_changed_sign = true;
        if (generation_mode === 0) {
            document.getElementById("slider_1").value = 100;
            changeSlider("slider_1", document.getElementById("slider_1").value)
            document.getElementById("slider_2").value = 0;
            changeSlider("slider_2", document.getElementById("slider_2").value)
        }
        renderResult();
    });
}

function loadBarchartExample() {
    source_datasets = [];
    source_datasets_names = [];
    d3.text("./data/barchart-0.csv", function (error, text) {
        if (error) throw error;
        DATATYPE = "BARCHART";
        source_datasets_names.push("barchart-0");
        let labelSet = new Set();
        if (!loadData(text, labelSet, "barchart-0")) {
            console.log("Loading file problem.");
            return
        }

        labelToClass = getLabelToClassMapping(labelSet);
        initGlobalVariables();

        processBarData(source_datasets);
        d3.select(".operationDiv").style('pointer-events', "auto");
        document.querySelector('#loading').classList.add('hide');
        data_changed_sign = true;
        if (generation_mode === 0) {
            document.getElementById("slider_1").value = 100;
            changeSlider("inputBox_nd", document.getElementById("slider_1").value)
            document.getElementById("slider_2").value = 0;
            changeSlider("inputBox_cd", document.getElementById("slider_2").value)
        }
        renderResult();
    });
}

//open file dialog to get the file name
function F_Open_dialog(type) {
    DATATYPE = type;
    let file_btn = document.getElementById("fileLoad");
    file_btn.click();
}

//used in website
$('#fileLoad').on('change', function (e) {
    // Check for the various File API support.
    if (window.File && window.FileReader && window.FileList && window.Blob) {
        // Great success! All the File APIs are supported.
    } else {
        alert('The File APIs are not fully supported in this browser.');
    }
    source_datasets = [];
    source_datasets_names = [];
    let labelSet = new Set();
    for (let i = 0; i < e.target.files.length; i++) {
        let file = e.target.files[i];
        var reader = new FileReader();
        reader.onload = function (event) {
            let file_name = event.target.fileName;
            if (!loadData(event.target.result, labelSet, file_name.split(".csv")[0])) {
                console.log("Loading file problem.");
                return
            }
            if (i === e.target.files.length - 1) {
                labelToClass = getLabelToClassMapping(labelSet);
                console.log(labelToClass);
                initGlobalVariables();
                d3.select("#class_num_info").text(labelSet.size);
                setTimeout(() => {
                    if (DATATYPE === "SCATTERPLOT") {
                        processScatterData(source_datasets);
                    }
                    if (DATATYPE === "BARCHART") {
                        processBarData(source_datasets);
                    }
                    if (DATATYPE === "LINECHART") {
                        processLineData(source_datasets);
                    }
                    d3.select(".operationDiv").style('pointer-events', "auto");
                    document.querySelector('#loading').classList.add('hide');
                    data_changed_sign = true;
                    renderResult();
                }, 0);
            }
        }

        reader.fileName = file.name
        reader.readAsText(file);


    }

});

function loadData(text, labelSet, fileName) {
    d3.select("#warn_div").style("display", "none");
    document.querySelector('#loading').classList.remove('hide');
    //parse pure text to data, and cast string to number
    let source_data = d3.csvParseRows(text, function (d) {
        if (!isNaN(d[0]) && !isNaN(d[1])) {
            return d; //.map(Number);
        }
    }).map(function (d) { // change the array to an object, use the first two feature as the position
        //source data
        var row = {};
        row.label = d[2];
        labelSet.add(row.label);
        row.x = +d[0];
        row.y = +d[1];
        return row;
    });
    // console.log("label set:", labelSet);
    if (labelSet.size > 100) {
        alert("Please load the data with right format.");
        document.querySelector('#loading').classList.add('hide');
        return false;
    }
    source_datasets.push(source_data);
    source_datasets_names.push(fileName);
    return true
}

function processScatterData(datasets) {
    xScale = d3.scaleLinear().range([0, svg_width]); // value -> display
    xMap = function (d) {
        return xScale(xValue(d));
    }; // data -> display
    xAxis = d3.axisBottom().scale(xScale).ticks(0);
    yScale = d3.scaleLinear().range([svg_height, 0]); // value -> display
    yMap = function (d) {
        return yScale(yValue(d));
    }; // data -> display
    yAxis = d3.axisLeft().scale(yScale).ticks(0);

    // using same scale
    let dataset = [];
    for (let i = 0; i < datasets.length; i++) {
        dataset = dataset.concat(datasets[i]);
    }
    xScale.domain(d3.extent(dataset, xValue));
    yScale.domain(d3.extent(dataset, yValue));

    scaled_datasets = []
    for (let i = 0; i < datasets.length; i++) {
        // // using different scale
        // xScale.domain(d3.extent(datasets[i], xValue));
        // yScale.domain(d3.extent(datasets[i], yValue));

        let tmp = []
        for (let d of datasets[i]) {
            tmp.push({
                x: xMap(d),
                y: yMap(d),
                label: d.label
            })
        }
        scaled_datasets.push(tmp)
    }

    // get cluster number for each class
    let cluster_num = Object.keys(labelToClass).length;
    cluster_nums = new Array(datasets.length)
    for (let i = 0; i < datasets.length; i++) {
        cluster_nums[i] = new Array(cluster_num).fill(0)
        var clusters = SplitDataByClass(datasets[i], labelToClass)
        for (let key in clusters) {
            if (clusters[key]) {
                cluster_nums[i][key] = clusters[key].length
            }
        }
    }

    calculateAlphaShapeDistance(scaled_datasets, [
        [0, 0],
        [svg_width, svg_height]
    ])
    calcChangingDistance(scaled_datasets)
    // for (let i = 0; i < cluster_num; i++) {
    //     for (let j = 0; j < cluster_num; j++) {
    //         if (i === j) continue;
    //         alphaShape_distance[i][j] *= Math.exp(change_distance[i]);
    //     }
    //     non_separability_weights[i] *= Math.exp(change_distance[i])
    // }
    reOrderClusters()
    hue_constraints = new Array(cluster_num).fill(0)
}

function processBarData(datasets) {
    // set the ranges
    xScale = d3.scaleBand()
        .range([0, svg_width])
        .padding(0.1);
    yScale = d3.scaleLinear()
        .range([svg_height, 0]);

    let dataset = [];
    for (let i = 0; i < datasets.length; i++) {
        dataset = dataset.concat(datasets[i]);
    }
    xScale.domain(Object.keys(labelToClass).map(function (d) {
        return d;
    }));
    yScale.domain([0, d3.max(dataset, yValue)]);

    // Scale the range of the data
    let cluster_num = Object.keys(labelToClass).length;
    alphaShape_distance = new Array(cluster_num);
    for (let i = 0; i < cluster_num; i++) {
        alphaShape_distance[i] = new Array(cluster_num).fill(0);
    }
    non_separability_weights = new Array(cluster_num).fill(0);
    for (let m = 0; m < datasets.length; m++) {
        //bar chart
        let baryCenter = new Array(cluster_num);
        for (let d of datasets[m]) {
            baryCenter[labelToClass[d.label]] = [xScale(d.label) + xScale.bandwidth() / 2, svg_height / 2 + yScale(d.y) / 2]
        }
        // only nearest two bars have a distance
        for (let i = 0; i < cluster_num - 1; i++) {
            let dist = Math.sqrt((baryCenter[i][0] - baryCenter[i + 1][0]) * (baryCenter[i][0] - baryCenter[i + 1][0]) + (baryCenter[i][1] - baryCenter[i + 1][1]) * (baryCenter[i][1] - baryCenter[i + 1][1]));
            alphaShape_distance[i][i + 1] += inverseFunc(dist + 1);
            non_separability_weights[i] += 1 / baryCenter[i][1];
        }
        non_separability_weights[cluster_num - 1] += 1 / baryCenter[cluster_num - 1][1];
    }
    console.log("alphaShape_distance:", alphaShape_distance);
    console.log("non_separability_weights:", non_separability_weights);

    for (let m = 0; m < datasets.length - 1; m++) {
        let baryCenter_0 = new Array(cluster_num),
            baryCenter_1 = new Array(cluster_num);
        for (let d of datasets[m]) {
            baryCenter_0[labelToClass[d.label]] = [xScale(d.label) + xScale.bandwidth() / 2, svg_height / 2 + yScale(d.y) / 2]
        }
        for (let d of datasets[m + 1]) {
            baryCenter_1[labelToClass[d.label]] = [xScale(d.label) + xScale.bandwidth() / 2, svg_height / 2 + yScale(d.y) / 2]
        }
        for (let i = 0; i < cluster_num; i++) {
            change_distance[i] += Math.abs(baryCenter_1[i][1] - baryCenter_0[i][1]);
        }
    }
    //normalize change_distance
    let change_distance_scale = d3.extent(change_distance);
    change_distance_scale[0] = 0;
    for (let i = 0; i < change_distance.length; i++) {
        change_distance[i] = (change_distance[i] - change_distance_scale[0]) / (change_distance_scale[1] - change_distance_scale[0] + 0.000000001);
    }
    console.log("change_distance", change_distance);

    hue_constraints = new Array(cluster_num).fill(0)
}

function processLineData(datasets) {
    // set the ranges
    xScale = d3.scaleLinear().range([0, svg_width]); // value -> display
    xMap = function (d) {
        return xScale(xValue(d));
    }; // data -> display
    xAxis = d3.axisBottom().scale(xScale).ticks(0);
    yScale = d3.scaleLinear().range([svg_height, 0]); // value -> display
    yMap = function (d) {
        return yScale(yValue(d));
    }; // data -> display
    yAxis = d3.axisLeft().scale(yScale).ticks(0);

    let dataset = [];
    for (let i = 0; i < datasets.length; i++) {
        dataset = dataset.concat(datasets[i]);
    }
    yScale.domain(d3.extent(dataset, function (d) {
        return d.y;
    }));
    let interpolated_datasets = [],
        x_interpolated_datasets = [];
    for (let m = 0; m < datasets.length; m++) {
        // Scale the range of the data
        xScale.domain(d3.extent(datasets[m], function (d) {
            return d.x;
        }));
        let linechart_source_data = [];
        for (let p of datasets[m]) {
            if (linechart_source_data[labelToClass[p.label]] == undefined) {
                linechart_source_data[labelToClass[p.label]] = { p: [], id: p.label };
            }
            linechart_source_data[labelToClass[p.label]].p.push({ x: p.x, y: p.y });
        }
        //interpolate line chart data
        let interpolated_linechart_data = [];
        let interpolated_points_step = 20;
        for (let line of linechart_source_data) {
            let line_path = line.p;
            for (let i = 0; i < line_path.length - 1; i++) {
                let x_0 = line_path[i].x,
                    x_1 = line_path[i + 1].x;
                let y_0 = line_path[i].y,
                    y_1 = line_path[i + 1].y;
                let interpolated_points_num = Math.floor(Math.sqrt((xScale(x_1) - xScale(x_0)) * (xScale(x_1) - xScale(x_0)) + (yScale(y_1) - yScale(y_0)) * (yScale(y_1) - yScale(y_0))) / interpolated_points_step);
                interpolated_points_num = (interpolated_points_num > 0) ? interpolated_points_num : 1;
                for (let j = 0; j < interpolated_points_num; j++) {
                    interpolated_linechart_data.push({ label: line.id, x: (x_1 - x_0) * j / interpolated_points_num + x_0, y: (y_1 - y_0) * j / interpolated_points_num + y_0 });
                }
            }
            interpolated_linechart_data.push({ label: line.id, x: line_path[line_path.length - 1].x, y: line_path[line_path.length - 1].y });
        }
        interpolated_datasets.push(interpolated_linechart_data)

        // interpolate the lines for changing distance: same x pos, get y position
        let x_interpolated_linechart_data = [];
        let x_interpolated_points_number = 40,
            x_interpolated_points_step = svg_width / x_interpolated_points_number;
        for (let line of linechart_source_data) {
            let line_path = line.p,
                x_count = 0,
                x;
            let x_0 = xScale(line_path[x_count].x),
                x_1 = xScale(line_path[x_count + 1].x);
            let y_0 = yScale(line_path[x_count].y),
                y_1 = yScale(line_path[x_count + 1].y);
            // console.log(line_path);
            for (let i = 0; i < x_interpolated_points_number; i++) {
                for (x = x_0; x < x_1; x += x_interpolated_points_step) {
                    x_interpolated_linechart_data.push({ label: line.id, x: x, y: (y_1 - y_0) * (x - x_0) / (x_1 - x_0) + y_0 });
                }
                x_count++;
                if (x_count === line_path.length - 1) break;
                if (x - x_interpolated_points_step < x_1) {
                    x_1 = xScale(line_path[x_count + 1].x);
                    y_1 = yScale(line_path[x_count + 1].y);
                    x_0 = x;
                    y_0 = (y_1 - yScale(line_path[x_count].y)) * (x - xScale(line_path[x_count].x)) / (x_1 - xScale(line_path[x_count].x)) + yScale(line_path[x_count].y);
                } else {
                    x_0 = xScale(line_path[x_count].x), x_1 = xScale(line_path[x_count + 1].x);
                    y_0 = yScale(line_path[x_count].y), y_1 = yScale(line_path[x_count + 1].y);
                }
            }
            x_interpolated_linechart_data.push({ label: line.id, x: x_1, y: y_1 });
        }
        x_interpolated_datasets.push(x_interpolated_linechart_data)
    }

    scaled_datasets = []
    for (let i = 0; i < interpolated_datasets.length; i++) {
        // using different scale
        // xScale.domain(d3.extent(datasets[i], xValue));
        // yScale.domain(d3.extent(datasets[i], yValue));

        let tmp = []
        for (let d of interpolated_datasets[i]) {
            tmp.push({
                x: xMap(d),
                y: yMap(d),
                label: d.label
            })
        }
        scaled_datasets.push(tmp)
    }

    // get cluster number for each class
    let cluster_num = Object.keys(labelToClass).length;
    cluster_nums = new Array(interpolated_datasets.length)
    for (let i = 0; i < interpolated_datasets.length; i++) {
        cluster_nums[i] = new Array(cluster_num).fill(0)
        var clusters = SplitDataByClass(interpolated_datasets[i], labelToClass)
        for (let key in clusters) {
            if (clusters[key]) {
                cluster_nums[i][key] = clusters[key].length
            }
        }
    }
    calculateAlphaShapeDistance(scaled_datasets, [
        [0, 0],
        [svg_width, svg_height]
    ])
    scaled_datasets = interpolated_datasets
    // caculate the changing distance between lines
    for (let i = 0; i < x_interpolated_datasets.length - 1; i++) {
        var ref_clusters = SplitDataByClass(x_interpolated_datasets[i], labelToClass),
            comp_clusters = SplitDataByClass(x_interpolated_datasets[i + 1], labelToClass);
        // for each cluster, calculate the cost
        for (let key in ref_clusters) {
            let ref = ref_clusters[key],
                target = comp_clusters[key];
            if (ref && target) {
                let dist_sum = 0;
                for (let j = 0; j < ref.length; j++) {
                    dist_sum += Math.abs(ref[j].y - target[j].y) / svg_width;
                }
                change_distance[key] += dist_sum / ref.length;
            } else {
                change_distance[key] += 1;
            }
        }
    }
    //normalize change_distance
    let change_distance_scale = d3.extent(change_distance);
    change_distance_scale[0] = 0;
    for (let i = 0; i < change_distance.length; i++) {
        change_distance[i] = (change_distance[i] - change_distance_scale[0]) / (change_distance_scale[1] - change_distance_scale[0] + 0.000000001);
    }
    console.log("change_distance", change_distance);

    // reorder lines
    reOrderClusters()
    hue_constraints = new Array(cluster_num).fill(0)
}