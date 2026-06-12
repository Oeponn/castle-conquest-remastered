on new me
  return me
end

on getDist me, posA, posB
  d = [:]
  d.addProp(#x, posB.x - posA.x)
  d.addProp(#y, posB.y - posA.y)
  d.addProp(#z, posB.z - posA.z)
  d.addProp(#total, sqrt((d.x * d.x) + (d.y * d.y) + (d.z * d.z)))
  return d
end

on getAngleXY me, tDistX, tDistY
  tAngle = atan(tDistY / tDistX) * 180 / PI
  tNewRot = tAngle
  return tNewRot
end
