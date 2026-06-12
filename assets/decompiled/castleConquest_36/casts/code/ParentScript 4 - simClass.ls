property pieceCount
global w, hk

on new me
  me.init()
  return me
end

on init me
  hk.Initialize(w, 0.20000000000000001, 1)
  pieceCount = 0
end

on addToSim me, tmodel
  tmodel.addToWorld()
  tmodel.addModifier(#meshDeform)
  modelName = tmodel.name
  weight = VOID
  isConvex = VOID
  convexType = VOID
  restitutionAmount = VOID
  frictionAmount = VOID
  simType = tmodel.userData.sim
  case simType of
    1:
      weight = 30
      isConvex = 1
      restitutionAmount = 1
      frictionAmount = 0.59999999999999998
    2:
      weight = 0
      restitutionAmount = 0.10000000000000001
      frictionAmount = 0.90000000000000002
    3:
      weight = 55
      isConvex = 1
      restitutionAmount = 0.5
      frictionAmount = 0.40000000000000002
    4:
      weight = 22
      isConvex = 1
      convexType = #sphere
      restitutionAmount = 0.20000000000000001
      frictionAmount = 0.80000000000000004
    5:
      weight = 30
      isConvex = 0
      restitutionAmount = 1
      frictionAmount = 0.59999999999999998
    6:
      weight = 10
      isConvex = 1
      restitutionAmount = 1
      frictionAmount = 0.59999999999999998
  end case
  if tmodel.transform.scale.x = 6 then
    if modelName contains "cannon" then
      weight = 0
    end if
  end if
  if weight then
    if convexType <> VOID then
      hk.makeMovableRigidBody(modelName, weight, isConvex, convexType)
    else
      hk.makeMovableRigidBody(modelName, weight, isConvex)
    end if
    rb = hk.rigidBody(modelName)
    rb.restitution = restitutionAmount
    rb.friction = frictionAmount
  else
    rb = hk.makeFixedRigidBody(modelName, 0)
    rb.restitution = restitutionAmount
    rb.friction = frictionAmount
  end if
end

on removeFromSim me, tmodel
  if tmodel <> VOID then
    modelName = tmodel.name
    rbValid = string(hk.rigidBody(modelName)).length
    if rbValid then
      hk.deleteRigidBody(modelName)
    end if
  end if
end

on loop me
  hk.step(0.10000000000000001, 15)
end
