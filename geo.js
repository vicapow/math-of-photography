var surface_box = function(pos, dim){
  var x = pos[0], y = pos[1], w = dim[0], h = dim[1]
  return [
    [
        [     x,     y ]
      , [ x + w,     y ]
    ]
    , [ 
        [ x + w,     y ]
      , [ x + w, y + h ]
    ]
    , [ 
        [ x + w, y + h ]
      , [ x    , y + h ]
    ]
    , [ 
        [     x, y + h ]
      , [     x,     y ]
    ]
  ]
}