/**
 * calculating the Color Saliency 
 * reference to "Color Naming Models for Color Selection, Image Editing and Palette Design"
 */
function getColorNameIndex(c) {
    var x = d3.lab(c),
        L = 5 * Math.round(x.L / 5),
        a = 5 * Math.round(x.a / 5),
        b = 5 * Math.round(x.b / 5),
        s = [L, a, b].join(",");
    return color_name_map[s];
}

function getColorSaliency(x) {
    let c = getColorNameIndex(x);
    return (c3.color.entropy(c) - minE) / (maxE - minE);
}

function getNameDifference(x1, x2) {
    let c1 = getColorNameIndex(x1),
        c2 = getColorNameIndex(x2);
    return 1 - c3.color.cosine(c1, c2);
}

/**
 * calculate KNNG distance
 */
function SplitDataByClass(data, label2class) {
    var clusters = {};
    for (let d of data) {
        if (clusters[label2class[d.label]] == undefined)
            clusters[label2class[d.label]] = [];
        clusters[label2class[d.label]].push({
            x: d.x,
            y: d.y,
            label: d.label
        });
    }
    return clusters;
}

/**
 * calculte the changing distance of each class
 * based on LAP(Linear Assignment Program)
 */
function calcChangingDistance(datasets) {
    let longest_distance = (SVGWIDTH - svg_margin.left - svg_margin.right) * 1.414;
    for (let i = 0; i < datasets.length - 1; i++) {
        var ref_clusters = SplitDataByClass(datasets[i], labelToClass),
            comp_clusters = SplitDataByClass(datasets[i + 1], labelToClass);
        // for each cluster, calculate the cost
        for (let key in labelToClass) {
            let ref = ref_clusters[labelToClass[key]],
                target = comp_clusters[labelToClass[key]];
            if (ref && target) {
                let cost = new Array(ref.length);
                for (let i = 0; i < ref.length; i++) {
                    if (!cost[i]) cost[i] = new Array(target.length);
                    for (let j = 0; j < target.length; j++) {
                        cost[i][j] = calcEuclidianDistance(ref[i], target[j]);
                    }
                }
                let solution = computeMunkres(cost);
                let dist_sum = 0;
                for (let j = 0; j < solution.length; j++) {
                    dist_sum += cost[solution[j][0]][solution[j][1]];
                }

                change_distance[labelToClass[key]] += dist_sum / (solution.length * longest_distance) + Math.abs(ref.length - target.length) / ref.length;
            } else {
                change_distance[labelToClass[key]] += 1;
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
}

/**
 * 1. calculate the separability
 * 2. calculate the non-separability
 * @param {*} datasets 
 * @param {*} extent 
 */
function calculateAlphaShapeDistance(datasets, extent) {
    let cluster_num = Object.keys(labelToClass).length;
    alphaShape_distance = new Array(cluster_num);
    for (let i = 0; i < cluster_num; i++) {
        alphaShape_distance[i] = new Array(cluster_num).fill(0);
    }
    let non_separability_weights_tmp = new Array(cluster_num).fill(0);
    non_separability_weights = new Array(cluster_num).fill(0);
    for (let m = 0; m < datasets.length; m++) {
        let voronoi = d3.voronoi().x(function(d) { return d.x; }).y(function(d) { return d.y; })
            .extent(extent);
        let diagram = voronoi(datasets[m]);
        let cells = diagram.cells;
        let alpha = 25 * 2;
        let distanceDict = {};
        for (let cell of cells) {
            if (cell === undefined) continue;
            let label = labelToClass[cell.site.data.label];
            // console.log(cell.halfedges);
            let stat = [0, 0];
            cell.halfedges.forEach(function(e) {
                let edge = diagram.edges[e];
                let ea = edge.left;
                if (ea === cell.site || !ea) {
                    ea = edge.right;
                }
                if (ea) {
                    let ea_label = labelToClass[ea.data.label];
                    let dx, dy, dist;
                    dx = cell.site[0] - ea[0];
                    dy = cell.site[1] - ea[1];
                    dist = Math.sqrt(dx * dx + dy * dy);
                    dist = inverseFunc(dist) / cell.halfedges.length
                    if (alpha > dist) {
                        if (label != ea_label) {
                            if (distanceDict[label] === undefined)
                                distanceDict[label] = {};
                            if (distanceDict[label][ea_label] === undefined)
                                distanceDict[label][ea_label] = [];
                            distanceDict[label][ea_label].push(dist);
                            stat[0] += dist;
                        } else {
                            stat[1] += dist;
                        }
                    }
                }
            });
            non_separability_weights_tmp[label] += (stat[0] - stat[1]);
        }
        // console.log("distanceDict:", distanceDict);

        for (var i in distanceDict) {
            for (var j in distanceDict[i]) {
                i = +i, j = +j;
                alphaShape_distance[i][j] += d3.sum(distanceDict[i][j]) / Math.pow(cluster_nums[m][i], 1);
            }
        }
        for (let i = 0; i < cluster_num; i++) {
            non_separability_weights[i] += non_separability_weights_tmp[i] / Math.pow(cluster_nums[m][i], 1);
        }
    }

    for (let i = 0; i < cluster_num; i++) {
        non_separability_weights[i] = Math.exp(non_separability_weights[i]);
    }
    console.log("alphaShape_distance:", alphaShape_distance);
    console.log("non_separability_weights:", non_separability_weights);

}