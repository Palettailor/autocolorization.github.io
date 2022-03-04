// Co-Saliency based Palette Generation for multiple multi-class scatterplots

d3.select(".operationDiv").style('pointer-events', "none");

document.querySelector('.instructions-container > div:last-child').onclick = () => {
    document.querySelector('.instructions-container').classList.add('hide')
}

function showHelp() {
    document.querySelector('.instructions-container').classList.remove('hide')
}

if (!getCookie("Palettailor")) {
    setCookie("Palettailor", 1, 30);
    console.log(document.cookie);
    document.querySelector('.instructions-container').classList.remove('hide');
}


function changeSlider(name, value) {
    let label_value = value / 100;
    switch (name) {
        case "slider_0":
            document.getElementById("inputBox_cos").value = value;
            score_importance_weight[0] = label_value;
            break;
        case "slider_1":
            document.getElementById("inputBox_nd").value = value;
            score_importance_weight[1] = label_value;
            break;
        case "slider_2":
            document.getElementById("inputBox_cd").value = value;
            score_importance_weight[2] = label_value;
            break;
        case "slider_3":
            document.getElementById("inputBox_lambda").value = value;
            cosaliency_lambda = label_value
            break;
        case "inputBox_cos":
            document.getElementById("slider_0").value = value;
            score_importance_weight[0] = label_value;
            break;
        case "inputBox_nd":
            document.getElementById("slider_1").value = value;
            score_importance_weight[1] = label_value;
            break;
        case "inputBox_cd":
            document.getElementById("slider_2").value = value;
            score_importance_weight[2] = label_value;
            break;
        case "inputBox_lambda":
            document.getElementById("slider_3").value = value;
            cosaliency_lambda = label_value
            break;
        default:
    }
}

function showSlider(name, item) {
    if (d3.select("#" + name).style("display") === 'none') {
        d3.select("#" + name).style("display", "block");
        d3.select(item).style("background-color", "#cccccc");
    } else {
        d3.select("#" + name).style("display", "none");
        d3.select(item).style("background-color", "#f6f6f6");
    }
}

$("input[name='generationMode']").change(function () {
    if ($(this).val() === "paletteGeneration") {
        generation_mode = 0;
        document.getElementById("slider_1").value = 100;
        changeSlider("slider_1", document.getElementById("slider_1").value)
        document.getElementById("slider_2").value = 0;
        changeSlider("slider_2", document.getElementById("slider_2").value)
    } else {
        generation_mode = 1;
        document.getElementById("slider_1").value = 0;
        changeSlider("slider_1", document.getElementById("slider_1").value)
        document.getElementById("slider_2").value = 0;
        changeSlider("slider_2", document.getElementById("slider_2").value)
    }
});

c3.load("js/lib/c3_data.json");
for (var c = 0; c < c3.color.length; ++c) {
    var x = c3.color[c];
    color_name_map[[x.L, x.a, x.b].join(",")] = c;
}

function addToHistory() {
    let svgs = d3.select("#renderDiv").selectAll("svg");
    if (svgs._groups[0].length > 0) {
        let li = d3.select(".historyList").append("li")
            .attr("data-palette", d3.select("#paletteText").attr('data-palette'))
            .style('cursor', 'pointer')
            .on("click", function () {
                addToHistory();
                let svg = d3.select(this).selectAll("svg");
                svg.each(function () {
                    d3.select(this).attr("width", SVGWIDTH).attr("height", SVGHEIGHT);
                    d3.select("#renderDiv").node().appendChild(d3.select(this).node());
                });
                let rect = d3.select(this).selectAll(".rect");
                rect.each(function () {
                    d3.select(".paletteDiv").node().appendChild(d3.select(this).node());
                });
                d3.select(this).remove();
                var result = d3.select(this),
                    palette = result.attr('data-palette').split(';');
                palette = palette.map(function (c) {
                    return d3.lab(c);
                });
                outputPalette(palette);
                drawTransferFunction(palette)
            });
        let div = li.append("div").attr("class", "screenshot");
        svgs.each(function () {
            d3.select(this).attr("width", 80).attr("height", 80)
                .attr("preserveAspectRatio", "xMinYMin meet")
                .attr("viewBox", "0 0 " + SVGWIDTH + " " + SVGHEIGHT);
            // li.node().appendChild(d3.select(this).node());
            div.node().appendChild(d3.select(this).node());
        });
        let rects = d3.select(".paletteDiv").selectAll(".rect");
        div = li.append("div").attr("class", "paletteBar");
        if (rects._groups[0].length > 0) {
            rects.each(function () {
                // li.node().appendChild(d3.select(this).node());
                div.node().appendChild(d3.select(this).node());
            });
        }
        li.append("div").attr("class", "delete_sign").append("i").attr("class", "icon_trash").style("color", "black").on("click", function () {
            li.remove();
            d3.event.stopPropagation()

        });
    }
}

function collectColorNames() {
    let color_names_checked = [];
    let inputs = d3.select("#color-names-div").selectAll("input");
    inputs.each(function () {
        // console.log(d3.select(this)._groups[0][0].value, d3.select(this)._groups[0][0].checked);
        if (d3.select(this)._groups[0][0].checked) {
            color_names_checked.push(d3.select(this)._groups[0][0].value);
        }
    });
    return color_names_checked;
}

function renderResult() {
    document.querySelector('#running').classList.remove('hide');

    setTimeout(() => {
        let palette;
        //scatterplot
        if (DATATYPE === "SCATTERPLOT") {
            palette = appendScatterplot();
        }

        //bar chart
        if (DATATYPE === "BARCHART") {
            palette = appendBarchart();
        }

        //line chart
        if (DATATYPE === "LINECHART") {
            palette = appendLinechart();
        }

        // draw the palette
        appendPaletteResult(palette);
        data_changed_sign = false;

        document.querySelector('#running').classList.add('hide')
    }, 0);
}

function appendScatterplot() {
    let used_palette = doColorization();
    for (let i = 0; i < source_datasets.length; i++) {
        xScale.domain(d3.extent(source_datasets[i], xValue));
        yScale.domain(d3.extent(source_datasets[i], yValue));
        let scatterplot_svg = d3.select("#renderDiv").append("svg")
            .attr("width", SVGWIDTH).attr("height", SVGHEIGHT);
        let scatterplot = scatterplot_svg.style("background-color", bgcolor).append("g")
            .attr("transform", "translate(" + svg_margin.left + "," + svg_margin.top + ")");
        // draw dots
        let dots = scatterplot.append("g").selectAll(".dot")
            .data(source_datasets[i])
            .enter().append("circle")
            .attr("class", "dot")
            .attr("id", function (d) {
                return "class_" + labelToClass[cValue(d)];
            })
            .attr("r", radius)
            .attr("cx", xMap)
            .attr("cy", yMap)
            .attr("fill", function (d) {
                return used_palette[labelToClass[cValue(d)]];
            })
            .attr("item-color", function (d) {
                return used_palette[labelToClass[cValue(d)]];
            })
        // add the x Axis
        scatterplot.append("g")
            .attr("transform", "translate(0," + svg_height + ")")
            .call(d3.axisBottom(xScale)); //.tickFormat("")

        // add the y Axis
        scatterplot.append("g")
            .call(d3.axisLeft(yScale)); //.tickFormat("")

        scatterplot_svg.append("text").attr("x", 0).attr("y", 20).text(source_datasets_names[i]);

    }
    if (color_blind_type != "Normal") {
        // show results seen from color blindness

        for (let i = 0; i < used_palette.length; i++) {
            let c = d3.rgb(used_palette[i]);
            let c1 = fBlind[color_blind_type]([parseInt(c.r), parseInt(c.g), parseInt(c.b)]);
            used_palette[i] = d3.rgb(c1[0], c1[1], c1[2]);
        }
        for (let i = 0; i < source_datasets.length; i++) {
            let scatterplot_svg = d3.select("#renderDiv").append("svg")
                .attr("width", SVGWIDTH).attr("height", SVGHEIGHT);
            let scatterplot = scatterplot_svg.style("background-color", bgcolor).append("g")
                .attr("transform", "translate(" + svg_margin.left + "," + svg_margin.top + ")");
            // draw dots
            let dots = scatterplot.append("g").selectAll(".dot")
                .data(source_datasets[i])
                .enter().append("circle")
                .attr("class", "dot")
                .attr("id", function (d) {
                    return "class_" + labelToClass[cValue(d)];
                })
                .attr("r", radius)
                .attr("cx", xMap)
                .attr("cy", yMap)
                .attr("fill", function (d) {
                    return used_palette[labelToClass[cValue(d)]];
                })
                .attr("item-color", function (d) {
                    return used_palette[labelToClass[cValue(d)]];
                })
            // add the x Axis
            scatterplot.append("g")
                .attr("transform", "translate(0," + svg_height + ")")
                .call(d3.axisBottom(xScale)); //.tickFormat("")

            // add the y Axis
            scatterplot.append("g")
                .call(d3.axisLeft(yScale)); //.tickFormat("")
            scatterplot_svg.append("text").attr("x", 0).attr("y", 20).text("Seen from people with color vision deficiency: " + source_datasets_names[i]);

        }
    }
    return used_palette;
}

function appendBarchart() {
    let used_palette = doColorization();
    for (let i = 0; i < source_datasets.length; i++) {
        let barchart_svg = d3.select("#renderDiv").append("svg")
            .attr("width", SVGWIDTH).attr("height", SVGHEIGHT);

        let barchart = barchart_svg.style("background-color", bgcolor)
            .append("g")
            .attr("transform", "translate(" + svg_margin.left + "," + svg_margin.top + ")");

        // add the x Axis
        barchart.append("g")
            .attr("transform", "translate(0," + svg_height + ")")
            .call(d3.axisBottom(xScale)); //.tickFormat("")

        // add the y Axis
        barchart.append("g")
            .call(d3.axisLeft(yScale)); //.tickFormat("")

        barchart.selectAll("bars")
            .data(source_datasets[i])
            .enter().append("rect")
            .attr("class", "bars")
            .attr("id", function (d) {
                return "bar_" + labelToClass[cValue(d)];
            })
            .style("fill", function (d) {
                return used_palette[labelToClass[cValue(d)]];
            })
            .attr("x", function (d) {
                return xScale(cValue(d));
            })
            .attr("width", xScale.bandwidth())
            .attr("y", function (d) {
                return yScale(yValue(d));
            })
            .attr("height", function (d) {
                return svg_height - yScale(yValue(d));
            })
            .attr("rx", 10).attr("ry", 10)
            .attr("item-color", function (d) {
                return used_palette[labelToClass[d.label]];
            })
        // .on("click", appendClickEvent);
        barchart_svg.append("text").attr("x", 0).attr("y", 20).text(source_datasets_names[i]);
    }

    return used_palette;
}

function appendLinechart() {
    let used_palette = doColorization();
    for (let i = 0; i < source_datasets.length; i++) {
        let linechart_svg = d3.select("#renderDiv").append("svg")
            .attr("width", SVGWIDTH).attr("height", SVGHEIGHT);

        let linechart = linechart_svg.style("background-color", bgcolor)
            .append("g")
            .attr("transform", "translate(" + svg_margin.left + "," + svg_margin.top + ")");

        // Scale the range of the data
        xScale.domain(d3.extent(source_datasets[i], function (d) {
            return d.x;
        }));
        // define the line
        let valueline = d3.line()
            .x(function (d) {
                return xScale(d.x);
            })
            .y(function (d) {
                return yScale(d.y);
            }).curve(d3.curveCatmullRom);

        let linechart_source_data = [],
            tmp_keys = [],
            count = 0;
        for (let point of source_datasets[i]) {
            if (tmp_keys[labelToClass[point.label]] == undefined) {
                tmp_keys[labelToClass[point.label]] = count++;
                linechart_source_data[tmp_keys[labelToClass[point.label]]] = { p: [], label: point.label };
            }
            linechart_source_data[tmp_keys[labelToClass[point.label]]].p.push({ x: point.x, y: point.y });
        }

        // Add the valueline path.
        linechart.selectAll('path')
            .data(linechart_source_data).enter().append("path")
            .attr("d", function (d) {
                return valueline(d.p);
            })
            .attr("class", "linechart")
            .attr("id", function (d) {
                return "line_" + labelToClass[d.label];
            })
            .attr("fill", "none")
            .attr("stroke", function (d) {
                return used_palette[labelToClass[d.label]];
            })
            .style("stroke-width", radius)
            .attr("item-color", function (d) {
                return used_palette[labelToClass[d.label]];
            })
        // .on("click", appendClickEvent);

        // Add the X Axis
        linechart.append("g")
            .attr("transform", "translate(0," + svg_height + ")")
            .call(d3.axisBottom(xScale)); //.tickFormat("")

        // Add the Y Axis
        linechart.append("g")
            .call(d3.axisLeft(yScale)); //.tickFormat("")

        linechart_svg.append("text").attr("x", 0).attr("y", 20).text(source_datasets_names[i]);
    }
    return used_palette;
}

function appendPaletteResult(palette) {
    let palette_results_div = d3.select(".paletteDiv");
    for (let i = 0; i < palette.length; i++) {
        // assemble a color
        let color = d3.rgb(palette[i]);
        let c = getColorNameIndex(color);
        // write the color name
        let t = c3.color.relatedTerms(c, 1);
        let span = palette_results_div.append("span").attr("class", "rect")
            .style("width", "30px").style("height", "30px").style("display", "inline-block")
            .style("margin-left", "10px").style("background", palette[i]).attr("color", palette[i])
            .style("text-align", "center").style("padding", "5px")
            .attr("title", function () {
                if (t[0] === undefined) return "no name";
                return c3.terms[t[0].index];
            });
        // append lock and unlock sign
        let img = span.append("img").attr("class", "icon_unlock").style("display", "none").attr("isLocked", "0")
            .on("click", function () {
                if (d3.select(this).attr("class") === "icon_lock")
                    d3.select(this).attr("class", "icon_unlock").attr("isLocked", "0").style("display", "none")
                else
                    d3.select(this).attr("class", "icon_lock").attr("isLocked", "1").style("display", "block")
            });
        if (locked_pos.indexOf(i) != -1) {
            img.attr("class", "icon_lock").style("display", "block").attr("isLocked", "1")
        }
        span.on("mouseover", function () {
            d3.select(this).select("img").style("display", "block");
        })
            .on("mouseout", function () {
                if (d3.select(this).select("img").attr("class") === "icon_unlock")
                    d3.select(this).select("img").style("display", "none")
            })
    }
    outputPalette(palette);

}

function outputPalette(palette) {
    //output the palette
    var format = resultsColorSpace,
        paletteStr = "[",
        data_palette_attr = "";
    for (let i = 0; i < palette.length - 1; i++) {
        paletteStr += "\"" + colorConversionFns[format](palette[i]) + "\",";
        data_palette_attr += palette[i] + ";";
    }
    paletteStr += "\"" + colorConversionFns[format](palette[palette.length - 1]) + "\"]";
    data_palette_attr += palette[palette.length - 1];
    d3.select("#paletteText").property('value', paletteStr).attr('data-palette', data_palette_attr);
}

$('.resultFnt').change(function () {
    resultsColorSpace = $(this).children("option:selected").text();
    var format = resultsColorSpace;
    var result = d3.select("#paletteText"),
        palette = result.attr('data-palette').split(';');

    palette = palette.map(function (c) {
        return d3.lab(c);
    });

    paletteStr = '[' + resultsQuote +
        palette.map(colorConversionFns[format])
            .join(resultsQuote + ', ' + resultsQuote) +
        resultsQuote + ']';
    result.property('value', paletteStr);
});

$('.paletteFnt').change(function () {
    let selection_text = $(this).children("option:selected").text();
    if (selection_text === "Input your own palette:") {
        let paletteStr = window.prompt("Input your own palette:", "[\"#4E79A7\", \"#F28E2B\", \"#E15759\", \"#76B7B2\", \"#59A14F\", \"#EDC948\", \"#B07AA1\", \"#FF9DA7\", \"#9C755F\", \"#BAB0AC\"]")
        if (paletteStr == "" || paletteStr == null) {
            return;
        }
        d3.select("#inputPaletteText").property('value', paletteStr);
    } else {
        let paletteStr = "[";
        if (selection_text === "Tableau 10") {
            assignment_palette = Tableau_10_palette.slice(0, 8);
        } else if (selection_text === "Tableau 20") {
            assignment_palette = Tableau_20_palette;
        } else if (selection_text === "ColorBrewer 12-class Paired") {
            assignment_palette = ['#a6cee3', '#1f78b4', '#b2df8a', '#33a02c', '#fb9a99', '#e31a1c', '#fdbf6f', '#ff7f00', '#cab2d6', '#6a3d9a', '#ffff99', '#b15928'].slice(0, 8)
        } else {
            assignment_palette = ['#8dd3c7', '#ffffb3', '#bebada', '#fb8072', '#80b1d3', '#fdb462', '#b3de69', '#fccde5', '#d9d9d9', '#bc80bd', '#ccebc5', '#ffed6f']
        }
        for (let i = 0; i < assignment_palette.length - 1; i++) {
            paletteStr += "\"" + assignment_palette[i] + "\",";
        }
        paletteStr += "\"" + assignment_palette[assignment_palette.length - 1] + "\"]";
        d3.select("#inputPaletteText").property('value', paletteStr);
    }
});
$('.paletteFnt').change();

function changeBgcolor() {
    let bg_icon = d3.select("#bg_icon");
    if (bg_icon.attr("class") === "icon_black_bg") {
        bg_icon.attr("class", "icon_white_bg");
        bgcolor = "#000";
        renderResult();
    } else {
        bg_icon.attr("class", "icon_black_bg");
        bgcolor = "#fff";
        renderResult();
    }
}

function saMode(mode) {
    if (mode === 0) {
        d3.select("#effi_icon").attr("class", "icon_efficiency_choosed");
        d3.select("#qual_icon").attr("class", "icon_quality");
        decline_rate = decline_rate_efficiency;
    } else {
        d3.select("#effi_icon").attr("class", "icon_efficiency");
        d3.select("#qual_icon").attr("class", "icon_quality_choosed");
        decline_rate = decline_rate_quality;
    }
}

function drawTransferFunction(palette) {
    d3.select("#tfDiv").selectAll("svg").remove();
    let m_SVGWIDTH = 380,
        m_SVGHEIGHT = 380;
    let m_svg_margin = {
        top: 30,
        right: 30,
        bottom: 30,
        left: 30
    }
    let m_svg_width = m_SVGWIDTH - m_svg_margin.left - m_svg_margin.right,
        m_svg_height = m_SVGHEIGHT - m_svg_margin.top - m_svg_margin.bottom;

    let tf_svg = d3.select("#tfDiv").append("svg")
        .attr("width", m_SVGWIDTH).attr("height", m_SVGHEIGHT);
    let tf = tf_svg.style("background-color", bgcolor)
        .append("g")
        .attr("transform", "translate(" + (m_svg_margin.left) + "," + m_svg_margin.top + ")");

    let m_xScale = d3.scaleBand().range([0, m_svg_width]);
    let m_yScale = d3.scaleLinear().range([m_svg_height, 0])

    let x_labels = Object.keys(labelToClass)
    // Scale the range of the data
    m_xScale.domain(x_labels);
    m_yScale.domain([0, 1]);


    // Add the X Axis
    tf.append("g")
        .attr("transform", "translate(0," + (m_svg_height) + ")")
        .call(d3.axisBottom(m_xScale));

    // Add the Y Axis
    tf.append("g")
        .call(d3.axisLeft(m_yScale));


    let drawLine = function (a, b, c, d, dash = false) {
        let line = tf.append("line")
            .attr("x1", a)
            .attr("y1", b)
            .attr("x2", c)
            .attr("y2", d)
            .style("stroke", "rgb(166,166,166)")
            .attr("stroke-width", 2);
        if (dash) {
            line.style("stroke-dasharray", ("3, 3"));
        }
    }
    let drag = d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    for (let i = 0; i < x_labels.length; i++) {

        if (i < x_labels.length - 1)
            drawLine(m_xScale(x_labels[i]) + m_xScale.bandwidth() / 2, m_yScale(change_distance[labelToClass[x_labels[i]]]), m_xScale(x_labels[i + 1]) + m_xScale.bandwidth() / 2, m_yScale(change_distance[labelToClass[x_labels[i + 1]]]))

        // draw control points
        tf.append("circle")
            .attr("id", function () {
                return "circle_" + labelToClass[x_labels[i]];
            })
            .attr("r", 10)
            .attr("cx", function () {
                return m_xScale(x_labels[i]) + m_xScale.bandwidth() / 2;
            })
            .attr("cy", function () {
                return m_yScale(change_distance[labelToClass[x_labels[i]]]);
            })
            .style("stroke", "#fff")
            .attr("fill", () => palette[labelToClass[x_labels[i]]])
            .call(drag);

    }

    // draw control points of kappa
    tf.append("circle")
        .attr("id", function () {
            return "circle_kappa";
        })
        .attr("r", 10)
        .attr("cx", function () {
            return 0;
        })
        .attr("cy", function () {
            return m_yScale(kappa);
        })
        .style("stroke", "#fff")
        .attr("fill", "#000")
        .call(drag);
    drawLine(0, m_yScale(kappa), m_svg_width, m_yScale(kappa), true)

    function dragstarted() {
        //d3.event.sourceEvent.stopPropagation();
        d3.select(this).attr("stroke-width", 5);
        d3.select(this).attr("cy", d3.event.y);
    }

    function dragged() {
        d3.select(this).attr("cy", d3.event.y);
    }

    function dragended() {
        d3.select(this).attr("stroke", "#fff").attr("stroke-width", 0);
        d3.select(this).attr("cy", d3.event.y);
        let circle_index = this.id.split("_")[1];
        if (circle_index == "kappa")
            kappa = m_yScale.invert(d3.event.y)
        else {
            change_distance[circle_index] = m_yScale.invert(d3.event.y)
            // re-order clusters
            reOrderClusters()
        }
        drawTransferFunction(palette);
    }

    // draw information table
    var dataForm = "";
    for (let i = 0; i < x_labels.length; i++) {
        let id = labelToClass[x_labels[i]]
        let c = getColorNameIndex(d3.rgb(palette[id])),
            t = c3.color.relatedTerms(c, 1);
        let color_name = "undefined"
        if (t[0] != undefined) {
            color_name = c3.terms[t[0].index]
        }
        dataForm += ("<tr><td><span class=\'icon_lock\' id=\'icon_lock-" + labelToClass[x_labels[i]] + "\' style=\'display:" + (hue_constraints[id] ? ("inline-block;\'></span>") : ("none;\'></span>")) +
            "</td><td>" +
            "<span class=\'tf_rect\' id=\'" + labelToClass[x_labels[i]] + "\' style=\'background:" + palette[id] + ";\' onclick=\'lockThisRect(this);\'></span>" +
            "</td><td>" +
            x_labels[i] +
            "</td><td>" +
            change_distance[id].toFixed(2) +
            "</td><td>" +
            color_name +
            "</td><td>" +
            // getColorSaliency(palette[id]).toFixed(2) +
            // getLuminance(palette[id]).toFixed(2) + " - " +
            // getSaturation(palette[id]).toFixed(2) + " - " +
            // d3_ciede2000(d3.lab(palette[id]), d3.lab(bgcolor)).toFixed(2) +
            colorConversionFns['Hex'](palette[id]) +
            "</td></tr>");
    }
    document.getElementById("tfInfoLabel").innerHTML = dataForm;
    d3.selectAll(".tf_rect")
        .append("img").attr("class", "rect_lock")
}

function reOrderClusters() {
    let order = []
    for (let i = 0; i < change_distance.length; i++) {
        order.push([i, change_distance[i]])
    }
    // re-order the clusters by the change distance
    order.sort(function (a, b) {
        return a[1] - b[1];
    })
    for (let i = 0; i < source_datasets.length; i++) {
        var clusters = {};
        for (let d of source_datasets[i]) {
            if (clusters[labelToClass[d.label]] == undefined)
                clusters[labelToClass[d.label]] = [];
            clusters[labelToClass[d.label]].push(d);
        }
        let data = []
        for (let j = 0; j < order.length; j++) {
            if (clusters[order[j][0]])
                data = data.concat(clusters[order[j][0]])
        }
        source_datasets[i] = data;
    }
}

function lockThisRect(item) {
    let choosed_id = +d3.select(item).attr("id")
    hue_constraints[choosed_id] = hue_constraints[choosed_id] === 1 ? 0 : 1
    d3.select("#icon_lock-" + choosed_id).style("display", hue_constraints[choosed_id] ? 'inline-block' : 'none')
}
