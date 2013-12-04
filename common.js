var w = window.innerWidth, h = window.innerHeight
  , max = Math.max(w, h), min = Math.min(w, h), pi = Math.PI, abs = Math.abs
  , cos = Math.cos, sin = Math.sin
  , line = d3.svg.line()

var mouse = [w * 0.5, h * 0.5]
d3.select('body').on('mousemove', function(){ mouse = d3.mouse(this) })

// some common vector functions
function rand(n){ return Math.random() * n}
function rot(a, t){
  var x = cos(t) * a[0] - sin(t) * a[1]
    , y = sin(t) * a[0] + cos(t) * a[1]
  return [x, y]
}
function angle(a){ return -Math.atan2(a[1], a[0]) }
// angle between a and b, counter-clockwise
function angle_between(a, b){
  if(a < 0) a += 2 * pi
  if(b < 0) b += 2 * pi
  if(b < a) b += 2 * pi
  return b - a
}
function angle_min_between(a, b){
  a = unit(a); b = unit(b); var flip = 1
  if(cross(a, b) > 0) flip = -1
  b[1] = flip * b[1]
  return flip * Math.acos(dot(a, b) / len(a) * len(b))
}
function angle_cap(p1, a, b){
  var c = angle(p1), l = len(p1)
  // all go from [0, 2pi]
  if(a < 0) a += 2 * pi
  if(b < 0) b += 2 * pi
  if(c < 0) c += 2 * pi
  c = c - a
  b = b - a
  // in range
  if(c <= b) c = c
  // out of range but closer to b
  else if(c - b < 2 * pi - c) c = b
  // out of range but closer to a
  else c = 0
  var vec = rot([l, 0], c + a)
  vec[1] = - vec[1] // y is down for screen coordinate space
  return vec
}
function sign(a){ if(a === 0) return 0; return a / Math.abs(a) }
function cross(a, b){ return  a[0] * b[1] - a[1] * b[0] }
function add(a, b){ return [ a[0] + b[0], a[1] + b[1] ] }
function minus(a, b){ return [ a[0] - b[0], a[1] - b[1] ] }
function midpoint(a, b){ return [ (a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5 ] }
function scale(a, s){ return [ a[0] * s, a[1] * s ] }
function len(a){ return Math.sqrt(a[0]*a[0] + a[1]*a[1]) }
function dot(a, b){ return a[0] * b[0] + a[1] * b[1] }
function unit(a){ var l = len(a); return [ a[0] / l, a[1] / l ] }
function projection(a, b){ return dot(a, unit(b))}
function flip(a){ return [ -a[0], -a[1] ] } // 180 rotation
// check if the ray described by `q` (position vector) and `s` 
// (direction vector) intersect the line segment described by vector positions
// `p1` and `p2`
function intersection(q, s, p1, p2){
  var p = p1, r = minus(p2, p1), n
  var r_cross_s = cross(r, s)
  if(!r_cross_s) return null // if 0, lines are parallel
  var q_minus_p = minus(q, p)
  var q_minus_p_cross_r = cross(q_minus_p, r)
  if(!q_minus_p_cross_r) return null // points are on the same line
  var t = cross(q_minus_p, s) / r_cross_s
  var u = q_minus_p_cross_r / r_cross_s
  var norms = normals(p1, p2) // gives back both normals [n1, n2]
  var r_cross_n = cross(r, norms[0])
  // if the ray and line segment do not intersect, return null
  if( t < 0 || t > 1 || u < 0.000001 ) return null
  // if check same sign
  if( r_cross_n * r_cross_s > 0) n = unit(norms[1]); else n = unit(norms[0])
  // find the normal that points in the direction of incoming intersecting ray
  n = unit(n)
  // calculate angle of reflection
  var aor = minus(s, scale(n, 2 * dot(s, n)) )
  return { position: add(q, scale(s, u)), u: u, normal: n, aor: aor }
}
function normals(p1, p2){
  var dx = p2[0] - p1[0]
  var dy = p2[1] - p1[1]
  var n1 = [-dy, dx], n2 = [dy, -dx]
  return [n1, n2]
}

function next_rays(surfaces, ray, num_diffuse){
  var r1 = ray[ray.length - 2]
    , r2 = ray[ray.length - 1]
  var intersect = d3.merge(surfaces.map(function(surface){
    return surface.geometry.map(function(segment){
      var intersect = intersection(r1, r2, segment[0], segment[1])
      if(!intersect) return null
      intersect.surface = segment
      intersect.material = surface.material
      return intersect
    })
  })).filter(function(d){ return d }).sort(function(a, b){ return a.u - b.u })[0]
  if(!intersect) return null // no new rays! :(

  // the rays we'll be returning. perfect reflection ray should come first
  var rays = [surface_reflection(intersect)]
  rays = rays.concat(surface_diffusion(intersect, num_diffuse))
  return rays
}

// where `angle` is an unit vector
function surface_reflection(intersect){
  var reflection = intersect.material && intersect.material.reflection
  // no more bouncing around. the light should be absorbed here.
  // the reflection direction vector `[0, 0]` is the special case.
  if(rand(1) > reflection) return [intersect.position, [0, 0]]
  // the ray survives to continue on its epic journey
  return [intersect.position, intersect.aor]
}
// where `angle` is an unit vector

function surface_diffusion(intersect, max){
  var diffusion = intersect.material && intersect.material.diffusion
  if(!diffusion) return []
  if(max < 2) max = 2
  var count = 0, rays = [], angle, spray = pi * 0.90
  while(count < max){
    angle = rot(intersect.normal, spray * 0.5 - spray * count / (max-1) )
    rays.push([intersect.position, angle])
    count++
  }
  return rays
}
function ray_to_segment(len, ray){
  return [ray[0], add(ray[0], scale(ray[1], len))]
}
// doe the ray still have a valid, none [0,0] angle on its tail? if so
// return true
function ray_absorbed(ray){
  return !(ray[ray.length - 1][0] || ray[ray.length - 1][1])
}

function ray_extend_angle(ray, len){
  // convert the trailing `angle` value to a `pos` vector
  var pos = add(ray[ray.length - 2], scale(ray[ray.length - 1], len))
  ray[ray.length - 1] = pos
  return ray
}
// takes a `rays` of the for [ position, angle ] where `position` is an [x, y] 
// vector array and `angle` is a unit vector angle array of the form [x, y]
// with respect to `position`.
// returns an array of the form [ ray1, ray2, ray4, ray5, etc... ] that specifies
// the path of the ray, after reflecting, refracting or diffusing off of
// the all `surfaces` depending on their material
function ray_trace(surfaces, max, ray_len, alive, num_diffuse){
  var ray, dead = [], count, reflected_rays, angle
  while(alive.length){
    ray = alive.pop()
    while(ray.lives-- > 0){
      // `reflected_rays` is an array of alternative [pos, angle] pairs (where 
      // `pos` and `angle` are also arrays)
      reflected_rays = next_rays(surfaces, ray.values, num_diffuse)
      // we never hit anything! extent to the ray `ray_len` to go appear as if
      // going on forever.
      if(!reflected_rays){ ray_extend_angle(ray.values, ray_len); break }
      // the ray did collide with something, but nothing got reflected
      if(!reflected_rays.length) { ray.values.pop(); break }
      // NOTE: the angle is always kept at the end of the ray
      // TODO: maybe keep it at the front?
      ray.values.pop() // remove the old angle
      // the next position. the first element of `reflected_rays` contains
      // the ray of perfect reflection to the original `ray`
      ray.values.push(reflected_rays[0][0])
      // add any other diffused rays to the `alive` set of rays
      reflected_rays.forEach(function(sub_ray, i){
        if(i === 0) return
        alive.push({ values: sub_ray, lives: ray.lives, id: ray.id
          , source: ray.source })
      })
      // the recent reflected array got absorbed by the material
      if(ray_absorbed(reflected_rays[0])) break
      ray.values.push(reflected_rays[0][1]) // the next angle
    }
    if(ray.lives <= 0) ray.values.pop() // remove the old angle
    // we had to kill the ray prematurely because it bounced too much :(
    // lets just cap off the angle
    dead.push(ray)
  }
  return dead
}
// create the source rays given a source light position
function source_rays(source, lives){
  return d3.range(source.rays).map(function(d, i){
    var theta, spray = source.spray, num_rays = source.rays
      , rot = source.rotation, pos = source.position
    if(num_rays > 1) theta = spray / 2 - d / (num_rays) * spray - rot
    else theta = - rot
    return { 
      values: [ pos, [ cos(theta), sin(theta) ] ]
      , lives: lives, source: source, id: i
    }
  })
}
function pos_circle(pos){
  return function(circle){ circle.attr({ cx: pos[0], cy: pos[1] }) }
}
function trans_str(x,y){ return 'translate(' + x + ',' + y + ')' }

function translate(pos){
  return function(g){ g.attr('transform', trans_str.apply(this, pos)) }
}

var color = (function color(alpha){
  var colors = ['rgb(255,0,0)', 'rgb(0,255,0)', 'rgb(0,0,255)']
  return function(d){
    var c = d3.rgb(colors[d % colors.length])
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + alpha + ')'
  }
})(1)

function transform(g){
  g.attr('transform', function(d){
    return 'translate(' + d.position[0] + ',' + d.position[1] + ')'
      + ' rotate(' + ( -d.rotation * 180 / pi) + ') '
  })
}

function setup_handle(handle){
  var datum = handle.datum()
    , g = handle.append('g').attr('class', 'controls')
    , normal_radius = 50
    , radius = normal_radius
    , prev_rays = datum.rays
    , arc = d3.svg.arc()
    , update_outline = function(outline){
        outline.attr('d', arc.innerRadius(radius - 2).outerRadius(radius + 2))
    }
    , dragging = false
  handle.on('mouseout', function(){
    if(is_child(handle.node(), d3.event.relatedTarget) || dragging) return
    radius = 10
    outline.transition().call(update_outline)
    shadow.transition().attr('r', radius)
    nob1.transition().attr({cx: 0, cy: 0})
    nob2.transition().attr({cx: 0, cy: 0})
  })
  // add and position the invisible bg circle
  g.append('circle').attr({r:radius + 20})
    .style('fill','rgba(0,0,0,0.0)')
    .call(d3.behavior.drag()
      .on("drag", function(){
        datum.position = mouse
        handle.call(transform)
      })
      .on('dragstart', function(){ dragging = true })
      .on('dragend', function(){ dragging = false })
    ).on('mouseover', function(){
      if(is_child(handle, d3.event.relatedTarget) || dragging) return
      radius = normal_radius
      outline.transition().call(update_outline)
      shadow.transition().attr('r', radius)
      nob1.transition().call(pos_circle(rot([radius, 0], - datum.spray / 2)))
      nob2.transition().call(pos_circle([-radius * 0.5, 0]))
    })
  var shadow = g.append('circle').attr({'class': 'shadow', r: radius})
  // create the outline border
  var outline = g.append('path').datum({ startAngle: pi/2, endAngle: -pi*2 })
    .attr('class', 'light').call(update_outline)
    .style('pointer-events','none')
  // `spray` and `ray number` nob
  var nob1 = g.append('circle')
    .call(pos_circle(rot([radius, 0], - datum.spray / 2)))
    .attr('r', 5).attr('class', 'nob spray')
    .call(d3.behavior.drag().on('dragstart', function(){
      prev_rays = datum.rays; dragging = true
    }).on('drag', function(){
      var pos = angle_cap(d3.mouse(this), 0, pi)
      datum.spray = angle(pos) * 2
      radius = len(pos)
      update_outline(outline)
      var min_scale = Math.max(prev_rays, 100)
      datum.rays = prev_rays + min_scale * (radius - normal_radius) / radius
      if(datum.rays < 0) datum.rays = 1
      d3.select(this).call(pos_circle(pos))
      // hide the rotation nob when the sray nob exceeds 359 degrees
      handle.select('.nob.rotation')
        .style('opacity', datum.spray >= 2 * pi ? 0 : 1)
    }).on('dragend', function(){
      dragging = false
      prev_radius = radius = normal_radius
      update_outline(outline)
      var pos = scale(unit(angle_cap(d3.mouse(this), 0, pi)), radius)
      d3.select(this).call(pos_circle(pos))
    }))
  // rotation nob
  var nob2 = g.append('circle').call(pos_circle([-radius * 0.5, 0]))
    .attr('r', 10).attr('class', 'nob rotation')
    .call(d3.behavior.drag().on('drag', function(){
      var pos = minus(d3.mouse(svg.node()), datum.position)
      datum.rotation = angle(pos) + pi
      handle.call(transform)
    }))
}

function is_child(parent, node){
  if(!node || !node.parentElement) return false
  if(node.parentElement === parent) return true
  return is_child(parent, node.parentElement)
}

// slider
function slider(g){
  return g.attr('class', 'handle').call(function(g){
    var d = g.datum(), x = 0
    if(!d.value) d.value = d.min
    g.append('line').attr({ x1: -d.length/2, y1: 0, x2: d.length/2, y2: 0 })
      .attr('class', 'light')
    var nob = g.append('circle').attr({r: 5, 'class': 'nob'}).call(pos)
    g.call(d3.behavior.drag().on('drag', function(){
      x = d3.mouse(nob.node())[0], m = d.length / 2, prev = d.value
      if(x < -m) x = -m; else if(x > m) x = m
      d.value = (x + m) / d.length * (d.max - d.min) + d.min
      if(d.step) d.value = Math.round(d.value)
      if(d.value === prev) return
      if(d.cb) d.cb(d.value)
      surface_scale(slider_n.datum().value)
      nob.call(pos)
    }))
    function pos(nob){ nob.call(pos_circle([x, 0])) }
  })
}

function setup_tracer(ctx){
  ctx.fillStyle = 'black'
  // draw loop
  d3.timer(function(){
    // clear the bg
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillRect(0, 0, w, h)
    ctx.globalCompositeOperation = 'lighter'
    
    // draw the surfaces
    ctx.lineWidth = 1
    ctx.strokeStyle = 'green' // color them green
    ctx.beginPath()
    surfaces.forEach(function(surface){
      surface.geometry.forEach(function(segment){
        ctx.moveTo(segment[0][0], segment[0][1])
        ctx.lineTo(segment[1][0], segment[1][1])
      })
    })
    ctx.stroke()

    ctx.lineWidth = 1

    var rays = d3.merge(sources.map(function(source){
      return source_rays(source, ray_lives)
    }))

    rays = ray_trace(surfaces, 20, 2000, rays, num_diffuse)

    // color the rays

    rays.forEach(function(ray){
      // ray.source.color
      ctx.strokeStyle = ray.source.color
      ctx.beginPath()
      ray.values.forEach(function(p, i){
        if(i === 0) ctx.moveTo(Math.round(p[0]) + 0.5, Math.round(p[1]) + 0.5)
        else ctx.lineTo(Math.round(p[0]) + 0.5,Math.round(p[1]) + 0.5)
      })
      ctx.stroke()
    })
  })
}