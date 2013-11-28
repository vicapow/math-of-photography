// some common vector functions
function cross(a, b){ return  a[0] * b[1] - a[1] * b[0] }
function add  (a, b){ return [ a[0] + b[0], a[1] + b[1] ] }
function minus(a, b){ return [ a[0] - b[0], a[1] - b[1] ] }
function scale(a, s){ return [ a[0] * s, a[1] * s ] }
function len(a){ return Math.sqrt(a[0]*a[0] + a[1]*a[1]) }
function dot  (a, b){ return a[0] * b[0] + a[1] * b[1] }
function unit(a){ var l = len(a); return [ a[0] / l, a[1] / l ] }
function projection(a, b){ return dot(a, unit(b))}
function intersection(q1, q2, p1, p2){
  var q = q1, s = minus(q2, q1), p = p1, r = minus(p2, p1)
  var r_cross_x = cross(r, s)
  if(!r_cross_x) return null // if 0, lines are parallel
  var q_minus_p = minus(q, p)
  var q_minus_p_cross_r = cross(q_minus_p, r)
  if(!q_minus_p_cross_r) return null // points are on the same line
  var t = cross(q_minus_p, s) / r_cross_x
  var u = q_minus_p_cross_r / r_cross_x
  if( t < 0 || t > 1 || u < 0.000001 ) return null
  return { p: add(q, scale(s, u)), u: u }
}
function normals(p1, p2){
  var dx = p2[0] - p1[0]
  var dy = p2[1] - p1[1]
  var n1 = [-dy, dx], n2 = [dy, -dx]
  return [n1, n2]
}
function reflection(q1, p1, p2){
  var line = minus(p2, p1)
  var p = minus(q1, p1)
  var proj = projection(p, line)
  return add(minus(scale(unit(line), 2 * proj), p), p1)
}
function mirror(q, p1, p2, sect){
  var n = normals(p1, p2)
  var ac = minus(q, p1)
  var ab = minus(p2, p1)
  var ad = minus(p1, add(p1, n[0]))
  var ac_cross_ab = cross(ac, ab)
  var ad_cross_ab = cross(ad, ab)
  ac_cross_ab = ac_cross_ab / Math.abs(ac_cross_ab)
  ad_cross_ab = ad_cross_ab / Math.abs(ad_cross_ab)
  if(ac_cross_ab === ad_cross_ab) n = n[0]; else n = n[1]
  return reflection(q, sect, add(sect, n))
}

function nextRay(surface, ray){
  var r1 = ray[0], r2 = add(ray[0], ray[1])
  var intersect = surface.map(function(segment){
    var intersect = intersection(r1, r2, segment[0], segment[1])
    if(!intersect) return null
    intersect.surface = segment
    return intersect
  }).filter(function(d){ return d }).sort(function(a, b){ return a.u - b.u })[0]
  if(!intersect) return null
  var m = mirror(r1, intersect.surface[0], intersect.surface[1], intersect.p)
  return [ intersect.p, unit(minus(m, intersect.p)) ]
}
function ray_to_segment(len, ray){
  return [ray[0], add(ray[0], scale(ray[1], len))]
}