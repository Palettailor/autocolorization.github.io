function doColorization() {
    let class_number = Object.keys(labelToClass).length;
    //get the lightness range
    let lightnessRange = [+d3.select("#lightnessFilterRangeLow").property('value'), +d3.select("#lightnessFilterRangeHigh").property('value')];
    let colors_scope = { "hue_scope": [0, 360], "lumi_scope": lightnessRange };

    // check if exist locked color
    let origin_palette = [],
        blank_pos = [],
        id = 0;
    locked_pos = []
    // let spans = d3.select(".paletteDiv").selectAll("span");
    // if (!data_changed_sign)
    //     spans.each(function () {
    //         if (+d3.select(this).select("img").attr("isLocked") === 1) {
    //             origin_palette.push(d3.rgb(d3.select(this).attr("color")))
    //             locked_pos.push(id)
    //         } else {
    //             origin_palette.push("")
    //             blank_pos.push(id)
    //         }
    //         id++;
    //     });

    color_names_checked = collectColorNames();
    if (color_names_checked.length > 0) {
        document.getElementById("pgRatioId").checked = true; // change mode to palette generation
        generation_mode = 0;
    }
    color_blind_type = document.querySelector('input[name = "colorblindType"]:checked').value;

    let best_color, best_color_array = new Array(1);
    initial_scores = [-1, -1]

    highlighted_classes = []
    for (let i = 0; i < class_number; i++) {
        if (change_distance[i] > kappa) {
            highlighted_classes.push([i, change_distance[i]])
        }
    }
    highlighted_classes.sort((a, b) => b[1] - a[1])
    console.log(highlighted_classes);
    if (highlighted_classes.length > 1) {
        let step_length = (lightnessRange[1] - lightnessRange[0] - 5) / (highlighted_classes.length - 1)
        if (step_length <= 10) {
            alert("The luminance range is not enough, please enlarge the range!")
            return;
        }
    }


    if (generation_mode && color_names_checked.length === 0) {
        console.log("assignment palette");
        // get current palette
        let input_palette_text = d3.select("#inputPaletteText").property("value");
        input_palette_text = input_palette_text.replace(/\"/g, '');
        assignment_palette = input_palette_text.split("[")[1].split("]")[0].split(",");
        best_color = doColorAssignment(assignment_palette, class_number);
    } else if (blank_pos.length === 0 || blank_pos.length === class_number) {
        console.log("generate palette");
        for (let i = 0; i < best_color_array.length; i++)
            best_color_array[i] = simulatedAnnealing2FindBestPalette(class_number, colors_scope);

        best_color_array.sort(function (a, b) { return b.score - a.score })
        best_color = best_color_array[0]
        while (best_color.score === -10000) {
            best_color = simulatedAnnealing2FindBestPalette(class_number, colors_scope);
        }
    } else {
        console.log("complete palette");
        best_color = completePalette(origin_palette, blank_pos, colors_scope);
    }

    let used_palette = new Array(class_number);
    for (let i = 0; i < class_number; i++) {
        used_palette[i] = best_color.id[i];
    }
    // if already have a svg, then insert it to the history
    addToHistory();
    drawTransferFunction(used_palette);
    console.log("score is ", best_color.score);

    return used_palette;
}

function getPaletteScore(p) {
    let palette = p.slice();
    if (color_names_checked != undefined && color_names_checked.length > 0) {
        let count = 0;
        for (let i = 0; i < palette.length; i++) {
            let c = getColorNameIndex(d3.rgb(palette[i])),
                t = c3.color.relatedTerms(c, 1);
            if (t[0] === undefined || color_names_checked.indexOf(c3.terms[t[0].index]) === -1) {
                count++;
            }
        }
        if (count > 2) // if there are more than two colors that are not in selected color names, then discard this palette
            return -1000000;
    }
    if (color_blind_type != "Normal") {
        for (let i = 0; i < palette.length; i++) {
            let c = d3.rgb(palette[i]);
            let c1 = fBlind[color_blind_type]([parseInt(c.r), parseInt(c.g), parseInt(c.b)]);
            palette[i] = d3.rgb(c1[0], c1[1], c1[2]);
        }
    }
    let color_dis = new Array(palette.length)
    for (let i = 0; i < palette.length; i++)
        color_dis[i] = new Array(palette.length)
    let bg_contrast_array = new Array(palette.length)
    let name_difference = 0
    for (let i = 0; i < palette.length; i++) {
        let name_i = getColorName(palette[i])
        if (name_i === "cyan") return -10000;// || name_i === "teal"

        for (let j = i + 1; j < palette.length; j++) {
            color_dis[i][j] = color_dis[j][i] = d3_ciede2000(d3.lab(palette[i]), d3.lab(palette[j]));
            name_difference += getNameDifference(palette[i], palette[j]);
        }
        bg_contrast_array[i] = d3_ciede2000(d3.lab(palette[i]), d3.lab(d3.rgb(bgcolor)));
    }
    let cosaliency_score = 0;
    let tmp_pd = new Array(palette.length).fill(0),
        tmp_cb = new Array(palette.length).fill(0);
    for (let i = 0; i < palette.length; i++) {
        for (let j = 0; j < palette.length; j++) {
            if (i === j) continue;
            tmp_pd[i] += alphaShape_distance[i][j] * color_dis[i][j];
        }
        if (change_distance[i] > kappa) {
            tmp_cb[i] += non_separability_weights[i] * bg_contrast_array[i]
        }
        else
            tmp_cb[i] -= non_separability_weights[i] * bg_contrast_array[i]

        tmp_pd[i] *= Math.exp(change_distance[i])
        tmp_cb[i] *= Math.exp(change_distance[i])
    }

    if (!generation_mode && highlighted_classes.length >= 1) {
        for (let i = 0; i < highlighted_classes.length; i++) {
            let hcl_i = rgb2hcl(palette[highlighted_classes[i][0]])
            for (let j = i + 1; j < highlighted_classes.length; j++) {
                let hcl_j = rgb2hcl(palette[highlighted_classes[j][0]]);
                if (change_distance[highlighted_classes[i][0]] > change_distance[highlighted_classes[j][0]]) {
                    if (hcl_i.l - hcl_j.l > -10
                        || hcl_i.c - hcl_j.c < 10
                        || bg_contrast_array[highlighted_classes[i][0]] < bg_contrast_array[highlighted_classes[j][0]]) {
                        return -10000;
                    }
                }
                if (change_distance[highlighted_classes[i][0]] < change_distance[highlighted_classes[j][0]]) {
                    if (hcl_i.l - hcl_j.l < 10
                        || hcl_i.c - hcl_j.c > -10
                        || bg_contrast_array[highlighted_classes[i][0]] > bg_contrast_array[highlighted_classes[j][0]]) {
                        return -10000;
                    }
                }
            }
        }
        // make sure the luminance of the classes with importance less than kappa is smaller than the luminance of the class with importance larger than kappa
        // let min_idx = highlighted_classes[highlighted_classes.length - 1][0]
        // let idxs = []
        // for (let i = 0; i < highlighted_classes.length; i++) {
        //     idxs.push(highlighted_classes[i][0])
        // }
        // let hcl_j = rgb2hcl(palette[min_idx])
        // for (let i = 0; i < palette.length; i++) {
        //     if (idxs.indexOf(i) != -1) continue;
        //     let hcl_i = rgb2hcl(palette[i])
        //     if (hcl_i.l - hcl_j.l < 10 || hcl_j.c - hcl_i.c < 10) {//
        //         return -10000;
        //     }
        // }
    }

    if (initial_scores[0] === -1) {
        initial_scores[0] = d3.sum(tmp_pd);
        initial_scores[1] = d3.sum(tmp_cb);
    }
    cosaliency_score = cosaliency_lambda * d3.sum(tmp_pd) / initial_scores[0] + (1 - cosaliency_lambda) * d3.sum(tmp_cb) / Math.abs(initial_scores[1]);
    name_difference /= palette.length * (palette.length - 1) * 0.25;

    let palette_score = score_importance_weight[0] * cosaliency_score + score_importance_weight[1] * name_difference;
    return palette_score
}

/**
 * using simulated annealing to find the best palette of given data
 * @param {*} palette_size 
 * @param {*} evaluateFunc 
 * @param {*} colors_scope: hue range, lightness range, saturation range
 * @param {*} flag 
 */
function simulatedAnnealing2FindBestPalette(palette_size, colors_scope = { "hue_scope": [0, 360], "lumi_scope": [35, 85] }, flag = true) {
    let iterate_times = 0;
    //default parameters
    let max_temper = 100000,
        dec = decline_rate,
        max_iteration_times = 10000000,
        end_temper = 0.001;
    cur_temper = max_temper;
    //generate a totally random palette
    let color_palette
    if (hue_constraints.indexOf(1) === -1)
        color_palette = getColorPaletteRandom(palette_size);
    else {
        var result = d3.select("#paletteText")
        color_palette = result.attr('data-palette').split(';');
        // color_palette = ['#ffdcf3',  '#bcc2c0', '#c1ebff','#d1fdc2', '#fff564', '#b152ff', '#a3fe26', '#feefd7']
        // color_palette = ["#ffeb4c","#ffe6b4","#c6c9cc","#d5a5ff","#d3eaff","#ff2a07","#aeff9a","#ffe8e8"]
        initial_palette = color_palette.slice();
    }
    //evaluate the default palette
    // updateCurrBestScore(color_palette)
    let o = {
        id: color_palette,
        score: getPaletteScore(color_palette)
    },
        preferredObj = o;

    while (cur_temper > end_temper) {
        for (let i = 0; i < 1; i++) { //disturb at each temperature
            iterate_times++;
            color_palette = o.id.slice();
            disturbColors(color_palette, colors_scope);
            let color_palette_2 = color_palette.slice();
            let o2 = {
                id: color_palette_2,
                score: getPaletteScore(color_palette_2)
            };

            let delta_score = o.score - o2.score;
            if (delta_score <= 0 || delta_score > 0 && Math.random() <= Math.exp((-delta_score) / cur_temper)) {
                o = o2;
                if (preferredObj.score - o.score < 0) {
                    preferredObj = o;
                    // updateCurrBestScore(preferredObj.id)
                }
            }
            if (iterate_times > max_iteration_times) {
                break;
            }
        }

        cur_temper *= dec;
    }

    return preferredObj;
}

function getColorPaletteRandom(palette_size) {
    let palette = [];
    for (let i = 0; i < palette_size; i++) {
        let rgb = d3.rgb(getRandomIntInclusive(0, 255), getRandomIntInclusive(0, 255), getRandomIntInclusive(0, 255));
        palette.push(rgb);
    }
    return palette;
}

function randomDisturbColors(palette, colors_scope) {
    let disturb_step = 50;
    // random disturb one color
    let idx = getRandomIntInclusive(0, palette.length - 1),
        rgb = d3.rgb(palette[idx]),
        color = d3.rgb(norm255(rgb.r + getRandomIntInclusive(-disturb_step, disturb_step)), norm255(rgb.g + getRandomIntInclusive(-disturb_step, disturb_step)), norm255(rgb.b + getRandomIntInclusive(-disturb_step, disturb_step))),
        hcl = rgb2hcl(color);

    color = hcl2rgb(d3.hcl(normScope(hcl.h, colors_scope.hue_scope), normScope(hcl.c, [0, 100]), normScope(hcl.l, colors_scope.lumi_scope)));
    palette[idx] = d3.rgb(norm255(color.r), norm255(color.g), norm255(color.b));
    let count = 0,
        sign;
    while (true) {
        while ((sign = isDiscriminative(palette)) > 0) {
            count += 1;
            if (count === 100) break;
            rgb = d3.rgb(palette[sign])
            color = d3.rgb(norm255(rgb.r + getRandomIntInclusive(-disturb_step, disturb_step)), norm255(rgb.g + getRandomIntInclusive(-disturb_step, disturb_step)), norm255(rgb.b + getRandomIntInclusive(-disturb_step, disturb_step)))
            hcl = rgb2hcl(color);
            if (hcl.h >= 85 && hcl.h <= 114 && hcl.l >= 35 && hcl.l <= 75) {
                if (Math.abs(hcl.h - 85) > Math.abs(hcl.h - 114)) {
                    hcl.h = 115;
                } else {
                    hcl.h = 84;
                }
            }
            palette[sign] = hcl2rgb(d3.hcl(normScope(hcl.h, colors_scope.hue_scope), normScope(hcl.c, [0, 100]), normScope(hcl.l, colors_scope.lumi_scope)));
        }
        let satisfy_color_name = true;
        if (color_names_checked.length > 0) {
            for (let i = 0; i < palette.length; i++) {
                let c = getColorNameIndex(d3.rgb(palette[i])),
                    t = c3.color.relatedTerms(c, 1);
                if (t[0] === undefined || color_names_checked.indexOf(c3.terms[t[0].index]) === -1) {
                    rgb = best_color_names[color_names_checked[getRandomIntInclusive(0, color_names_checked.length - 1)]]
                    palette[i] = d3.rgb(norm255(rgb.r + getRandomIntInclusive(-10, 10)), norm255(rgb.g + getRandomIntInclusive(-10, 10)), norm255(rgb.b + getRandomIntInclusive(-10, 10)))
                    satisfy_color_name = false;
                }
            }
        }

        if (satisfy_color_name || count >= 100) break;
    }

    if (highlighted_classes.length > 1) {
        // hcl = d3.hcl(36, 90, colors_scope.lumi_scope[0] + 5)
        if (Math.random() < 0.3) {
            hcl = d3.hcl(getRandomIntInclusive(0, 359), 90, colors_scope.lumi_scope[0] + 5)
            rgb = hcl2rgb(hcl)
            rgb = d3.rgb(norm255(rgb.r), norm255(rgb.g), norm255(rgb.b));
            hcl = rgb2hcl(rgb)
            while (hcl.l <= +colors_scope.lumi_scope[0] || hcl.l >= +colors_scope.lumi_scope[1]) {
                hcl = d3.hcl(getRandomIntInclusive(0, 359), 90, colors_scope.lumi_scope[0] + 5)
                rgb = hcl2rgb(hcl)
                rgb = d3.rgb(norm255(rgb.r), norm255(rgb.g), norm255(rgb.b));
                hcl = rgb2hcl(rgb)
            }
        } else {
            hcl = rgb2hcl(palette[highlighted_classes[0][0]])
        }

        let step_length = (colors_scope.lumi_scope[1] - colors_scope.lumi_scope[0] - 5) / (highlighted_classes.length - 1)
        console.log("step_length is ", step_length);
        for (let i = 0; i < highlighted_classes.length; i++) {
            palette[highlighted_classes[i][0]] = hcl2rgb(d3.hcl(hcl.h, hcl.c - 15 * i, hcl.l + step_length * i))
            // palette[highlighted_classes[i][0]] = hcl2rgb(d3.hcl(normScope(hcl.h, colors_scope.hue_scope), normScope(hcl.c - 15 * i, [0, 100]), normScope(hcl.l + 15 * i, colors_scope.lumi_scope)));
        }
    }
    // for each color, make sure the value is legal
    for (let i = 0; i < palette.length; i++) {
        hcl = rgb2hcl(palette[i])
        palette[i] = hcl2rgb(d3.hcl(normScope(hcl.h, colors_scope.hue_scope), normScope(hcl.c, [0, 100]), normScope(hcl.l, colors_scope.lumi_scope)));
    }
}

function isDiscriminative(palette) {
    for (let i = 0; i < palette.length; i++) {
        for (let j = i + 1; j < palette.length; j++) {
            let color_dis = d3_ciede2000(d3.lab(palette[i]), d3.lab(palette[j]));
            if (color_dis < 10) {
                return j;
            }
        }
        if (d3_ciede2000(d3.lab(palette[i]), d3.lab(bgcolor)) < 10) {
            return i;
        }
    }
    return -1;
}

/**
 * only use color discrimination
 * @param {} palette 
 * @param {*} colors_scope 
 */
function disturbColors(palette, colors_scope) {
    randomDisturbColors(palette, colors_scope);
}

/**
 * color assignment
 */
function doColorAssignment(palette, class_number) {
    let iterate_times = 0;
    //default parameters
    let max_temper = 100000,
        dec = decline_rate,
        max_iteration_times = 10000000,
        end_temper = 0.001;
    cur_temper = max_temper;
    //generate a totally random palette
    let color_palette = palette;
    //evaluate the default palette
    let o = {
        id: color_palette,
        score: getPaletteScore(color_palette.slice(0, class_number))
    },
        preferredObj = o;

    while (cur_temper > end_temper) {
        for (let i = 0; i < 1; i++) { //disturb at each temperature
            iterate_times++;
            color_palette = o.id.slice();
            let idx_0, idx_1;
            // randomly shuffle two colors of the palette 
            idx_0 = getRandomIntInclusive(0, class_number - 1);
            idx_1 = getRandomIntInclusive(0, class_number - 1);
            while (idx_0 === idx_1) {
                idx_1 = getRandomIntInclusive(0, class_number - 1);
            }
            if (Math.random() < 0.5) {
                idx_0 = getRandomIntInclusive(0, class_number - 1);
                idx_1 = getRandomIntInclusive(class_number, color_palette.length - 1);
            }

            let tmp = color_palette[idx_0];
            color_palette[idx_0] = color_palette[idx_1];
            color_palette[idx_1] = tmp;
            let o2 = {
                id: color_palette,
                score: getPaletteScore(color_palette.slice(0, class_number))
            };

            let delta_score = o.score - o2.score;
            if (delta_score <= 0 || delta_score > 0 && Math.random() <= Math.exp((-delta_score) / cur_temper)) {
                o = o2;
                if (preferredObj.score - o.score < 0) {
                    preferredObj = o;
                }
            }
            if (iterate_times > max_iteration_times) {
                break;
            }
        }

        cur_temper *= dec;
    }

    return preferredObj;
}