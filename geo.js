var surface_box = function(pos, dim){
  var x = pos[0], y = pos[1], w = dim[0], h = dim[1]
  return [
      [ [ x    , y     ], [ x + w, y     ] ]
    , [ [ x + w, y     ], [ x + w, y + h ] ]
    , [ [ x + w, y + h ], [ x    , y + h ] ]
    , [ [ x    , y + h ], [ x    , y     ] ]
  ]
}

function surface_open_box(pos, dim){
  var surface = surface_box(pos, dim)
  surface.splice(3, 1)
  return surface
}

function surface_pinhole(p1, p2, w){
  var r = minus(p2, p1), l = len(r), u = unit(r)
    , q1 = add(p1, scale(u, l / 2 - w / 2))
    , q2 = add(p1, scale(u, l / 2 + w / 2))
  return [ [p1, q1], [q2, p2] ]
}

function points_circle(pos, r, n){
  return d3.range(n).map(function(d){
    var theta = (d + 1) / n * 2 * pi
    return [ pos[0] + cos(theta) * r, pos[1] + sin(theta) * r ]
  })
}
