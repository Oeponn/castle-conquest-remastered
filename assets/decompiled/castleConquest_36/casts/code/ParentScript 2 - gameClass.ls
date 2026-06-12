property sim, castleBuilder, ai, Math, mBall, defaultBallPos, defaultBallRot, ballThrown, rbBall, movepowerMeter, maxPower, ballThrust, ballAngleY, ballAngleZ, xSpeed, ySpeed, zSpeed, forceSpeed, playerNum, player2CastlePieceList, player1CastlePieceList, savedPlayer1CastlePieceList, player1CastleDataList, player2CastleDataList, player2PiecePosList, player1PiecePosList, player1PiecePosListDefault, player2PiecePosListDefault, castleTypePlayer1, maxCastleId, maxPlayerCastleId, player1Turn, turnCount, roundCount, gameWon, game_state, cam_state, ballCamStartDist, ballCamStopDist, myCam, mouseIsUp_boolean, keyIsUp_boolean, mouseOnTarget, totalScore, castleConquestSharedObject, aimVelX, aimVelY, aimSpeedInc, aimMaxSpeed, aimFriction, channelCycle, smokeCount, smokeAnimCycle, drawTimer, drawSpeed, player1Gold, player2Gold, player1Score, player2Score, player1Type, player2Type, defaultHint_txt, aimCamToggle, damageGoal, player1Cannon, player2Cannon, asplode_texture, thrust, accuracy, activeMeter_spr, oscSpeed, oscPerc, oscVal, meterDir
global w, hk, sprNum, soundOn

on new me
  return me
end

on init me
  w = member("gameWorld")
  hk = member("gameWorld_Havok")
  sim = script("simClass").new()
  castleBuilder = script("castleBuilderClass").new()
  ai = script("aiClass").new()
  Math = script("mathClass").new()
  player2CastlePieceList = []
  player1CastlePieceList = []
  savedPlayer1CastlePieceList = []
  player2PiecePosList = []
  player1PiecePosList = []
  player2PiecePosListDefault = []
  SharedObject = newObject("SharedObject")
  castleConquestSharedObject = SharedObject.getLocal("cstlcnqst20")
  sharedObjectSize = castleConquestSharedObject.getSize()
  if sharedObjectSize <= 0 then
    castleConquestSharedObject.flush()
    castleConquestSharedObject.data.gold = 0
  end if
  if not castleConquestSharedObject.data.gold then
    castleConquestSharedObject.data.gold = 0
  end if
  maxCastleId = 12
  maxPower = 1800
  damageGoal = 50
  ballCamStartDist = -150
  ballCamStopDist = 100
  aimSpeedInc = 0.01
  aimMaxSpeed = 10
  aimFriction = 0.97999999999999998
  roundCount = 0
  totalScore = 0
  member("gameScore_txt").text = string(totalScore)
  channelCycle = 1
  me.drawTimer = 0
  me.drawSpeed = 10
  player1Score = 0
  player2Score = 0
  player1CastleType = #default
  player1Gold = castleConquestSharedObject.data.gold
  player1Turn = 1
  me.initGameWorld()
  defaultHint_txt = EMPTY
  me.initCastleSelect()
end

on nextRoundInit me
  gameWon = 0
  turnCount = 1
  roundCount = roundCount + 1
  me.game_state = #setPower
  me.setStageVisibility(#game)
  me.initGameWorld()
  mBall = w.model("ball")
  defaultBallPos = mBall.transform.position
  defaultBallRot = mBall.transform.rotation
  mBall.visibility = #none
  w.model("pivot_camBall").visibility = #none
  w.model("ballShadow").visibility = #none
  w.model("ballShadowShape").visibility = #none
  sim.init()
  sim.addToSim(w.model("p_ground"))
  sim.addToSim(w.model("p_playPLane_1"))
  sim.addToSim(w.model("p_playPLane_2"))
  me.makeDefaultCastles()
  player1Cannon = me.getCannon(player1CastlePieceList)
  player2Cannon = me.getCannon(player2CastlePieceList)
  resetPowerMeter()
  mouseIsUp_boolean = 1
  keyIsUp_boolean = 1
  cam_state = #waiting
  player1Turn = 1
  w.model("pivot_camAim").transform.position.x = player1Cannon.transform.position.x
  w.model("pivot_camAim").transform.position.y = player1Cannon.transform.position.y
  mBall.transform.position.x = player1Cannon.transform.position.x
  mBall.transform.position.y = player1Cannon.transform.position.y
  me.pickCam("aim")
  forceSpeed = -600
  ballAngleY = 60.0
  ballAngleZ = 0
  ballThrown = 0
  turnCount = 1
  aimVelX = 0
  aimVelY = 0
  smokeAnimCycle = 0
  powerupFlagAvailable = 1
  powerupAvailable = 0
  aimCamToggle = 0
  me.displayScore(1)
  defaultHint_txt = "Use Arrow Keys To Aim The Cannon. Hold Down Spacebar To Set Power Level."
  sprite(sprNum.hint_txt).member.text = defaultHint_txt
  if player2Type = #human then
    me.displayPlayer(1)
  end if
  me.checkFlagsDown()
end

on nextRoundButtonPressed me
  castleData_str = me.encodeCastleData(player1CastlePieceList)
  player1CastleDataList = castleBuilder.parseCastleData(castleData_str)
  me.initCastleSelect()
end

on main me
  t = getGameTimer()
  if t < me.drawTimer then
    exit
  end if
  me.drawTimer = t + me.drawSpeed
  case me.game_state of
    #ballInPlay:
      waitTime = 10
      maxWaitTime = 18
      me.ballInPlayCamControl()
      if player1Turn then
        goingRight = keyPressed(124)
        goingLeft = keyPressed(123)
        goingUp = keyPressed(125)
        goingDown = keyPressed(126)
        me.ballController(goingLeft, goingRight, goingUp, goingDown)
      end if
      if the timer > (60 * waitTime) then
        tPiecesStillMoving = me.checkForPieceMovement()
        if (tPiecesStillMoving = 0) or (the timer > (120 * maxWaitTime)) then
          game_state = #setPower
          me.turnEnd()
        end if
      else
        if the timer < 180 then
          smokeFPS = 5
          smokeAnimCycle = (smokeAnimCycle mod smokeFPS) + 1
          if smokeAnimCycle = smokeFPS then
            opacityOffsetPerc = 1.0 - ((the timer + 1) / 180.0)
            me.makeSmoke(mBall.getWorldTransform().position, opacityOffsetPerc)
          end if
        else
          absX = abs(mBall.getWorldTransform().position.x)
          maxGroundDistX = 600
          if absX > maxGroundDistX then
            game_state = #setPower
            me.turnEnd()
          end if
        end if
      end if
      sim.loop()
      me.ballShadowFollow()
    #setPower:
      if player1Turn or (player2Type = #human) then
        goingRight = keyPressed(124)
        goingLeft = keyPressed(123)
        goingUp = keyPressed(125)
        goingDown = keyPressed(126)
        me.ballController(goingLeft, goingRight, goingUp, goingDown)
        defaultHint_txt = "Use Arrow Keys To Aim The Cannon. Hold Down Spacebar To Start Setting Power Level."
        sprite(sprNum.hint_txt).member.text = defaultHint_txt
      else
        tPowerData = ai.setPower(roundCount, turnCount, maxPower, mBall, player1PiecePosListDefault, savedPlayer1CastlePieceList)
        me.throwBall(tPowerData)
        sprite(sprNum.hint_txt).member.text = "- Computer Player Turn -"
      end if
    #setAccuracy:
      if player1Turn or (player2Type = #human) then
        goingRight = keyPressed(124)
        goingLeft = keyPressed(123)
        goingUp = keyPressed(125)
        goingDown = keyPressed(126)
        me.ballController(goingLeft, goingRight, goingUp, goingDown)
      end if
    #throwBall:
      if player1Turn then
        me.applyVelToAimCam()
      end if
    #roundOver:
    #dragModel:
      me.dragModel()
    #init:
      me.init()
    #submitSave:
      me.saveCheck()
    #submitChallenge:
      me.loadChallengeCheck()
    #submitChallengeOnly:
      me.loadChallengeOnlyCheck()
    #submitCastles:
      me.loadCastlesCheck()
  end case
  if movepowerMeter then
    me.oscilatePower()
  end if
  me.keyDown()
end

on getGameTimer
  tRet = 0
  tms = the milliSeconds
  if tms < 0 then
    tRet = the maxinteger - abs(tms)
  else
    tRet = tms
  end if
  return tRet
end

on ballShadowFollow me
  w.model("ballShadow").transform.position.x = mBall.getWorldTransform().position.x
  w.model("ballShadow").transform.position.y = mBall.getWorldTransform().position.y
  maxZ = 100
  zPerc = 1.0 - (mBall.getWorldTransform().position.z / 100.0)
  if zPerc < 0 then
    zPerc = 1
  end if
  w.model("ballShadow").shader.blend = 60 + (20.0 * zPerc)
  mScale = 1.30000000000000004 + (0.29999999999999999 * zPerc)
  w.model("ballShadow").transform.scale = vector(mScale, mScale, mScale)
end

on keyDown me
  if player1Turn then
    throwButton = 49
    keyIsDown = keyPressed(throwButton)
    if keyIsDown then
      if keyIsUp_boolean then
        keyIsUp_boolean = 0
        me.throwControl()
      end if
    end if
  end if
end

on keyUp me
  if player1Turn then
    throwButton = 49
    spacebarIsDown = keyPressed(throwButton)
    if (game_state = #game) or (game_state = #setAccuracy) or (game_state = #setPower) or (game_state = #throwBall) then
      if the keyCode = 18 then
        me.pickCam("front1")
      else
        if the keyCode = 19 then
          me.pickCam("castle1")
        else
          if the keyCode = 20 then
            me.pickCam("side1")
          else
            if the keyCode = 21 then
              me.pickCam("top1")
            else
              if the keyCode = 23 then
                me.pickCam("front2")
              else
                if the keyCode = 22 then
                  me.pickCam("castle2")
                else
                  if the keyCode = 26 then
                    me.pickCam("side2")
                  else
                    if the keyCode = 28 then
                      me.pickCam("top2")
                    else
                      if the keyCode = 25 then
                        me.pickCam("start")
                      else
                        if the keyCode = 29 then
                          me.pickCam("aim")
                        else
                          if spacebarIsDown = 0 then
                            if keyIsUp_boolean = 0 then
                              keyIsUp_boolean = 1
                            end if
                          end if
                        end if
                      end if
                    end if
                  end if
                end if
              end if
            end if
          end if
        end if
      end if
    end if
  end if
  if me.game_state = #roundOver then
    if player1Turn = 0 then
      me.tallyScore()
      player1Turn = 1
    else
      me.gameOver()
    end if
  else
    if me.game_state = #tallyScore then
      if roundCount < maxCastleId then
        me.initCastleSelect()
      else
        me.castlesConquered()
      end if
    else
      if me.game_state = #gameOver then
        go("intro")
      else
        if me.game_state = #castlesConquered then
          player1Gold = 0
          me.saveCastleSharedObject()
          go("intro")
        end if
      end if
    end if
  end if
end

on pickCam me, camName
  sprite(sprNum.gameWorld_w3d).camera = w.camera("cam_" & camName & "Shape")
  myCam = camName
end

on ballController me, goingLeft, goingRight, goingUp, goingDown
  playCrank = 0
  if goingLeft then
    if ballThrown then
      rbBall.applyForce(vector(0, -forceSpeed, 0))
    else
      if game_state = #setPower then
        aimVelX = aimVelX + aimSpeedInc
        playCrank = 1
      end if
    end if
  end if
  if goingRight then
    if ballThrown then
      rbBall.applyForce(vector(0, forceSpeed, 0))
    else
      if game_state = #setPower then
        aimVelX = aimVelX - aimSpeedInc
        playCrank = 1
      end if
    end if
  end if
  mBall.transform.rotation = vector(0, 0, w.camera("cam_aimShape").getWorldTransform().rotation.z + 91)
  if (game_state = #setPower) or (game_state = #setAccuracy) then
    if goingUp then
      aimVelY = aimVelY - aimSpeedInc
      playCrank = 1
    else
      if goingDown then
        aimVelY = aimVelY + aimSpeedInc
        playCrank = 1
      end if
    end if
    me.applyVelToAimCam()
    if soundOn then
      if playCrank then
        if sound(3).volume < 200 then
          sound(3).stop()
          sound(3).play(member("crank_sound"))
          sound(3).volume = 200
        end if
      else
        sound(3).fadeOut(50)
      end if
    end if
  end if
end

on applyVelToAimCam me
  if (aimCamToggle = 0) and (ballAngleZ <> 0) then
    me.pickCam("aim")
    aimCamToggle = 1
  end if
  w.camera("cam_aimShape").rotate(0, aimVelX, 0, #parent)
  ballAngleZ = ballAngleZ + aimVelX
  mBall.rotate(0, -aimVelY, 0, #self)
  w.camera("cam_aimShape").rotate(aimVelY * 0.90000000000000002, 0, 0, w.camera("cam_aimShape"))
  ballAngleY = ballAngleY - aimVelY
  if ballAngleZ > 23 then
    ballAngleZ = 23
    w.camera("cam_aimShape").rotate(0, -aimVelX, 0, #parent)
    aimVelX = aimVelX * -0.5
  else
    if ballAngleZ < -27 then
      ballAngleZ = -27
      w.camera("cam_aimShape").rotate(0, -aimVelX, 0, #parent)
      aimVelX = aimVelX * -0.5
    end if
  end if
  if ballAngleY < 15 then
    ballAngleY = 15
    mBall.rotate(0, aimVelY, 0, #self)
    w.camera("cam_aimShape").rotate(-aimVelY * 0.90000000000000002, 0, 0, w.camera("cam_aimShape"))
    aimVelY = aimVelY * -0.5
  else
    if ballAngleY > 67 then
      ballAngleY = 67
      mBall.rotate(0, aimVelY, 0, #self)
      w.camera("cam_aimShape").rotate(-aimVelY * 0.90000000000000002, 0, 0, w.camera("cam_aimShape"))
      aimVelY = aimVelY * -0.5
    end if
  end if
  sprite(sprNum.rotationDial_bmp).rotation = ballAngleZ * -2.5
  sprite(sprNum.angleDial_bmp).rotation = (ballAngleY * 1.69999999999999996) - 25
  aimVelX = aimVelX * aimFriction
  aimVelY = aimVelY * aimFriction
end

on ballInPlayCamControl me
  tBallDist = mBall.getWorldTransform().position.x
  if player1Turn then
    tBallDist = -tBallDist
  end if
  if cam_state = #waiting then
    if tBallDist < -ballCamStartDist then
      cam_state = #started
    end if
  else
    if cam_state = #started then
      if tBallDist > -ballCamStopDist then
        if player1Turn then
          if myCam <> "ball" then
            me.pickCam("ball")
            w.model("pivot_camBall").transform.position = mBall.getWorldTransform().position
          else
            w.model("pivot_camBall").transform.position = mBall.getWorldTransform().position
          end if
        end if
      else
        if player1Turn = 0 then
          if myCam <> "castle1" then
            me.pickCam("castle1")
          end if
        else
          if myCam <> "castle2" then
            me.pickCam("castle2")
          end if
        end if
        cam_state = #stopped
      end if
    end if
  end if
end

on throwControl me
  if game_state = #setPower then
    initPowerMeter()
    game_state = #setAccuracy
  else
    if game_state = #setAccuracy then
      meterPerc = me.getMeterPerc(activeMeter_spr.height, sprite(sprNum.powerMeterContainer_bmp).height)
      thrust = (maxPower * meterPerc * 0.29999999999999999) + (maxPower * 0.69999999999999996)
      me.initPowerAccuracy()
      game_state = #throwBall
    else
      if game_state = #throwBall then
        markerFromBottom = sprite(sprNum.powerMeterContainer_bmp).bottom - sprite(sprNum.accuracyMarker_bmp).bottom
        maxMarkerDistance = sprite(sprNum.powerMeterContainer_bmp).height - markerFromBottom
        meterFromBottom = activeMeter_spr.height
        meterFromMarker = meterFromBottom - markerFromBottom
        accuracy = float(meterFromMarker) / maxMarkerDistance
        movepowerMeter = 0
        me.throwBall(thrust)
      end if
    end if
  end if
end

on initPowerMeter me
  oscPerc = 0
  oscSpeed = 0.02
  oscVal = 1.5
  movepowerMeter = 1
  sprite(sprNum.powerMeter_bmp).visible = 1
  sprite(sprNum.accuracyMeter_bmp).visible = 0
  sprite(sprNum.powerMeter_bmp).color = rgb("FFFF00")
  activeMeter_spr = sprite(sprNum.powerMeter_bmp)
  defaultHint_txt = "Release Spacebar To Set Power Level."
  sprite(sprNum.hint_txt).member.text = defaultHint_txt
end

on initPowerAccuracy me
  minThrust = 1200
  maxThrust = 1820
  multiplier = (1 - oscPerc) * 0.80000000000000004
  if multiplier < 0.10000000000000001 then
    multiplier = 0.10000000000000001
  end if
  oscSpeed = oscSpeed * multiplier
  if meterDir < 0 then
    oscSpeed = oscSpeed * -1
  end if
  sprite(sprNum.accuracyMeter_bmp).visible = 1
  sprite(sprNum.accuracyMeter_bmp).color = rgb("00DDFF")
  activeMeter_spr = sprite(sprNum.accuracyMeter_bmp)
  defaultHint_txt = "Press Spacebar a Second Time To Set Accuracy Level."
  sprite(sprNum.hint_txt).member.text = defaultHint_txt
end

on resetPowerMeter me
  containerTop = sprite(sprNum.powerMeterContainer_bmp).top
  tPowerMeter_sprite = sprite(sprNum.powerMeter_bmp)
  tPowerMeter_sprite.top = containerTop
  tPowerMeter_sprite.top = containerTop + tPowerMeter_sprite.height
  tPowerMeter_sprite = sprite(sprNum.accuracyMeter_bmp)
  tPowerMeter_sprite.top = containerTop
  tPowerMeter_sprite.top = containerTop + tPowerMeter_sprite.height
  movepowerMeter = 0
end

on oscilatePower me
  containerTop = sprite(sprNum.powerMeterContainer_bmp).top
  oscilate()
  newTop = (sprite(sprNum.powerMeterContainer_bmp).height * oscPerc) + containerTop
  if newTop >= 173 then
    if me.game_state = #throwBall then
      me.throwControl()
    end if
  end if
  oldTop = activeMeter_spr.top
  activeMeter_spr.top = newTop
  if newTop < oldTop then
    meterDir = -1
  else
    meterDir = 1
  end if
end

on oscilate me
  oscVal = oscVal + oscSpeed
  oscPerc = abs(sin(oscVal))
end

on getMeterPerc me, val, maxVal
  powerPerc = float(val) / float(maxVal)
  return powerPerc
end

on getThrowVectors me, tBallThrust
  tAngle = ballAngleY / 360 * 2 * PI
  if player1Turn then
    tAngle = (ballAngleY + 15) / 360 * 2 * PI
  end if
  xSpeed = tBallThrust * sin(tAngle)
  zSpeed = tBallThrust * cos(tAngle)
  tAngle = float(mBall.transform.rotation.z) / 360 * 2 * PI
  ySpeed = xSpeed * sin(tAngle)
  xSpeed = xSpeed * cos(tAngle)
end

on throwBall me, tBallThrust
  me.getThrowVectors(tBallThrust)
  mBall.visibility = #front
  w.model("ballShadow").visibility = #front
  w.model("ballShadowShape").visibility = #front
  mBall.transform.scale = vector(3.39999999999999991, 3.39999999999999991, 3.39999999999999991)
  playerCannon = VOID
  if player1Turn then
    playerCannon = player1Cannon
  else
    playerCannon = player2Cannon
  end if
  multiplier = 1
  if playerCannon.name contains "cannonB" then
    mBall.transform.scale = vector(6, 6, 6)
  end if
  sim.addToSim(mBall)
  rbBall = member("gameWorld_Havok").rigidBody("ball")
  if (player1Turn = 0) and ((player2Type = #computer) or (player2Type = #challenger)) then
    tside = -1
    rbBall.applyImpulse(vector(xSpeed * tside * multiplier, ySpeed * tside * multiplier, zSpeed * multiplier))
  else
    tRandomPerc = 1 - accuracy + 0.01
    tMaxRand = 400
    tRandX = 0
    tRandY = tMaxRand * accuracy
    tRandZ = 0
    rbBall.applyImpulse(vector((xSpeed * multiplier) + tRandX, (ySpeed * multiplier) + tRandY, (zSpeed * multiplier) + tRandZ))
  end if
  sound(1).stop()
  sound(2).stop()
  sound(3).stop()
  sound(4).stop()
  if soundOn then
    sound(2).play(member("boompoof_sound"))
  end if
  detectCastlePieceList = []
  if player1Turn then
    w.model("pivot_camBall").transform.rotation.z = mBall.transform.rotation.z
    rbBall.angularVelocity = vector(0, -1, 0)
    detectCastlePieceList = player2CastlePieceList
    sound(2).volume = 200
    me.makeStreamSmoke(mBall.getWorldTransform().position, -1)
  else
    w.model("pivot_camBall").transform.rotation.z = mBall.transform.rotation.z + 180
    rbBall.angularVelocity = vector(0, 1, 0)
    detectCastlePieceList = player1CastlePieceList
    sound(2).volume = 100
  end if
  iCount = detectCastlePieceList.count
  repeat with i = 1 to iCount
    tmCastlePiece = detectCastlePieceList[i]
    rbCastlePiece = tmCastlePiece.name
    if (rbCastlePiece contains "cannon") = 0 then
      hk.registerInterest("ball", rbCastlePiece, 0, 1, #castleCollisionHandler, me)
    end if
  end repeat
  hk.registerInterest("ball", "p_ground", 0, 1, #groundCollisionHandler, me)
  ballThrown = 1
  startTimer()
  game_state = #ballInPlay
  me.pickCam("start")
  movepowerMeter = 0
  defaultHint_txt = EMPTY
  sprite(sprNum.hint_txt).member.text = defaultHint_txt
end

on castleCollisionHandler me, collisionDetails
  relativeVel = collisionDetails[5]
  maxVel = 5
  velPerc = relativeVel / maxVel
  me.makeAsplode(mBall.getWorldTransform().position, velPerc)
  if soundOn then
    newVolume = velPerc * 255
    channelCycle = (channelCycle + 1) mod 3
    prevChannel = 4 + ((channelCycle + 2) mod 3)
    if (sound(prevChannel).elapsedTime > 100) or (soundBusy(prevChannel) = 0) then
      sound(4 + channelCycle).play(member("rockHit_sound"))
      sound(4 + channelCycle).volume = newVolume
    end if
  end if
end

on groundCollisionHandler me, collisionDetails
  if soundOn then
    if (soundBusy(5) = 0) and (soundBusy(4) = 0) then
      sound(5).stop()
      sound(5).play(member("groundHit_sound"))
      sound(5).volume = 20
      me.makeSmokePoof(mBall.getWorldTransform().position, 0.80000000000000004)
    end if
  end if
end

on resetBall me
  w.model("pivot_camBall").transform.position = w.model("ball").getWorldTransform().position
  playerCannon = VOID
  if player1Turn then
    playerCannon = player1Cannon
  else
    playerCannon = player2Cannon
  end if
  mBall.transform.position = defaultBallPos
  mBall.transform.rotation = defaultBallRot
  mBall.transform.position.x = playerCannon.transform.position.x
  mBall.transform.position.y = playerCannon.transform.position.y
  if player1Turn then
    me.pickCam("aim")
  else
    me.pickCam("start")
  end if
  ballThrown = 0
end

on switchplayerTurns me
  player1Turn = not player1Turn
  defaultBallPos.x = -defaultBallPos.x
  defaultBallRot.z = -defaultBallRot.z
  w.model("pivot_camBall").transform.rotate(0, 0, 180)
  playerCannon = VOID
  if player1Turn then
    w.camera("cam_aimShape").transform.rotation.y = 0
    playerCannon = player1Cannon
  else
    w.camera("cam_aimShape").transform.rotation.y = 180
    playerCannon = player2Cannon
  end if
  tAimCamPosX = w.model("pivot_camAim").transform.position.x
  w.model("pivot_camAim").transform.position.x = playerCannon.transform.position.x
  w.model("pivot_camAim").transform.position.y = playerCannon.transform.position.y
  ballAngleY = 60.0
  forceSpeed = -forceSpeed
  addCastlePieceList = VOID
  if player1Turn then
    turnCount = turnCount + 1
    addCastlePieceList = player2CastlePieceList
  else
    addCastlePieceList = player1CastlePieceList
  end if
  sim.init()
  sim.addToSim(w.model("p_ground"))
  sim.addToSim(w.model("p_playPLane_1"))
  sim.addToSim(w.model("p_playPLane_2"))
  iCount = addCastlePieceList.count
  repeat with i = 1 to iCount
    tmCastlePiece = addCastlePieceList[i]
    if (tmCastlePiece.name contains "cannon") = 0 then
      sim.addToSim(tmCastlePiece)
    end if
  end repeat
  aimCamToggle = 0
end

on makeDefaultCastles me
  player2CastlePieceList = []
  player1CastlePieceList = []
  player2PiecePosList = []
  player1PiecePosList = []
  player2PiecePosListDefault = []
  Dir = 1
  computerCastleNumId = roundCount mod (maxCastleId + 1)
  if computerCastleNumId <= 0 then
    computerCastleNumId = 1
  end if
  player2CastleDataList = castleBuilder.getCastleDataList(computerCastleNumId)
  player2CastlePieceList = castleBuilder.makeCastle(player2CastleDataList, -1)
  player2PiecePosList = []
  iCount = player2CastlePieceList.count
  repeat with i = 1 to iCount
    tmPiece = player2CastlePieceList[i]
    player2PiecePosList.add(tmPiece.getWorldTransform().position)
    player2PiecePosListDefault.add(tmPiece.getWorldTransform().position)
    sim.addToSim(tmPiece)
  end repeat
  player1CastlePieceList = castleBuilder.makeCastle(player1CastleDataList, 1)
  player1PiecePosListDefault = []
  iCount = player1CastlePieceList.count
  repeat with i = 1 to iCount
    tmPiece = player1CastlePieceList[i]
    player1PiecePosList.add(tmPiece.getWorldTransform().position)
    player1PiecePosListDefault.add(tmPiece.getWorldTransform().position)
  end repeat
  savedPlayer1CastlePieceList = player1CastlePieceList
end

on getModelDist me, modelA, modelB
  posA = w.model(modelA).getWorldTransform().position
  posB = w.model(modelB).getWorldTransform().position
  d = Math.getDist(me, posA, posB)
  return d
end

on checkForPieceMovement me
  tDistSum = 0
  tDistAverage = 0
  if player1Turn then
    iCount = player2CastlePieceList.count
    repeat with i = 1 to iCount
      newPos = player2CastlePieceList[i].getWorldTransform().position
      oldPos = player2PiecePosList[i]
      tDist = Math.getDist(newPos, oldPos)
      tDistSum = tDistSum + tDist.total
      player2PiecePosList[i] = newPos
    end repeat
    tDistAverage = tDistSum / iCount
  else
    iCount = player1CastlePieceList.count
    repeat with i = 1 to iCount
      newPos = player1CastlePieceList[i].getWorldTransform().position
      oldPos = player1PiecePosList[i]
      tDist = Math.getDist(newPos, oldPos)
      tDistSum = tDistSum + tDist.total
      player1PiecePosList[i] = newPos
    end repeat
    tDistAverage = tDistSum / iCount
  end if
  tPiecesStillMoving = 1
  tThreshold = 0.003
  if tDistAverage <= tThreshold then
    tPiecesStillMoving = 0
  end if
  return tPiecesStillMoving
end

on turnEnd me
  flagsDown = me.checkFlagsDown()
  if flagsDown or gameWon then
    me.roundEnd()
  end if
  w.camera("cam_aimShape").transform.rotation = vector(0, 0, 0)
  mBall.transform.rotation = vector(0, 0, 0)
  ballAngleY = 0
  ballAngleZ = 0
  aimVelX = 0
  aimVelY = 0
  resetPowerMeter()
  me.switchplayerTurns()
  me.resetBall()
  cam_state = #waiting
  me.clearSmoke()
  keyIsUp_boolean = 1
end

on roundEnd me
  game_state = #roundOver
  defaultHint_txt = EMPTY
  if player1Turn then
    if soundOn then
      sound(6).stop()
      sound(6).play(member("hitGreat_sound"))
    end if
    if player2Type = #computer then
      if gameWon then
        defaultHint_txt = "YOU WON! Enemy Cannon Destroyed!" & RETURN & "- Press Any Key To Continue -"
      else
        defaultHint_txt = "YOU WON! All Enemy Flags Captured!" & RETURN & "- Press Any Key To Continue -"
      end if
    else
      defaultHint_txt = "PLAYER 1 WINS!" & RETURN & "- Press Any Key To Continue -"
    end if
  else
    if soundOn then
      sound(6).stop()
      if player2Type = #computer then
        sound(6).play(member("hitBad_sound"))
        if gameWon then
          defaultHint_txt = "YOU LOST! Player Cannon Destroyed!" & RETURN & "- Press Any Key To Continue -"
        else
          defaultHint_txt = "YOU LOST! All PLayer Flags Captured!" & RETURN & "- Press Any Key To Continue -"
        end if
      else
        sound(6).play(member("hitGreat_sound"))
        defaultHint_txt = "PLAYER 2 WINS!" & RETURN & "- Press Any Key To Continue -"
      end if
    end if
  end if
  sprite(sprNum.hint_txt).member.alignment = #center
  sprite(sprNum.hint_txt).member.text = defaultHint_txt
  sim.init()
end

on tallyScore me
  game_state = #tallyScore
  me.setStageVisibility(#tallyScore)
  tCastlePieceList = player2CastlePieceList
  tCastlePiecePosListDefault = player2PiecePosListDefault
  tDamageCount = 0
  tFlagDamageCount = 0
  tFlagCount = 0
  iCount = tCastlePieceList.count
  repeat with i = 1 to iCount
    newPos = tCastlePieceList[i].getWorldTransform().position
    oldPos = tCastlePiecePosListDefault[i]
    tDist = Math.getDist(newPos, oldPos)
    damaged = 0
    if tDist.total > 5.0 then
      tDamageCount = tDamageCount + 1
      damaged = 1
    end if
    if tCastlePieceList[i].name contains "flag" then
      tFlagCount = tFlagCount + 1
    end if
  end repeat
  tDamagePerc = float(tDamageCount) / iCount
  tDamagePerc = integer(100 * tDamagePerc)
  tDamageBasePoints = 100
  flagDamage = tFlagCount * 25
  castleDamage = tDamageCount * 5
  rubbleReward = damageGoal - tDamagePerc
  if rubbleReward < 0 then
    rubbleReward = 0
  end if
  tCastlePieceList = player1CastlePieceList
  tCastlePiecePosListDefault = player1PiecePosListDefault
  tDamageCount = 0
  tFlagDamageCount = 0
  tFlagCount = 0
  iCount = tCastlePieceList.count
  repeat with i = 1 to iCount
    newPos = tCastlePieceList[i].getWorldTransform().position
    oldPos = tCastlePiecePosListDefault[i]
    tDist = Math.getDist(newPos, oldPos)
    damaged = 0
    if tDist.total > 5.0 then
      tDamageCount = tDamageCount + 1
      damaged = 1
    end if
    if tCastlePieceList[i].name contains "flag" then
      tFlagCount = tFlagCount + 1
      if damaged then
        tFlagDamageCount = tFlagDamageCount + 1
        tDamageCount = tDamageCount - 1
      end if
    end if
  end repeat
  flagProtect = (tFlagCount - tFlagDamageCount) * 50
  tPointsTotal = castleDamage + rubbleReward + flagProtect + flagDamage
  tTotals_member = sprite(sprNum.tallyTotals_txt).member
  tTotals_member.text = castleDamage & EMPTY & RETURN & EMPTY & rubbleReward & EMPTY & RETURN & EMPTY & flagProtect & EMPTY & RETURN & EMPTY & flagDamage & EMPTY & RETURN & EMPTY & RETURN & EMPTY & tPointsTotal
  player1Score = player1Score + tPointsTotal
  player1Gold = player1Gold + tPointsTotal
  me.displayScore(1)
  me.saveCastleSharedObject()
end

on checkFlagsDown me
  tCastlePieceList = player2CastlePieceList
  tCastlePiecePosListDefault = player2PiecePosListDefault
  if player1Turn = 0 then
    tCastlePieceList = player1CastlePieceList
    tCastlePiecePosListDefault = player1PiecePosListDefault
  end if
  tFlagCount = 0
  tFlagDamageCount = 0
  iCount = tCastlePieceList.count
  repeat with i = 1 to iCount
    piece = tCastlePieceList[i]
    if piece.name contains "flag" then
      tFlagCount = tFlagCount + 1
      rotAbsX = abs(piece.getWorldTransform().rotation.x)
      if player1Turn then
        rotAbsX = 180 - abs(piece.getWorldTransform().rotation.x)
      end if
      rotAbsY = abs(piece.getWorldTransform().rotation.y)
      if (rotAbsX > 20) or (rotAbsY > 20) then
        tFlagDamageCount = tFlagDamageCount + 1
      end if
    end if
  end repeat
  flagsDown = 0
  if tFlagCount <= tFlagDamageCount then
    flagsDown = 1
  end if
  if player1Turn then
    sprite(sprNum.flags_txt).member.text = "Flags " & tFlagDamageCount & "/" & tFlagCount
  end if
  return flagsDown
end

on checkDamagePerc me
  myMeterSpr = sprite(sprNum.player2Meter_bmp)
  tCastlePieceList = player2CastlePieceList
  tCastlePiecePosListDefault = player2PiecePosListDefault
  if player1Turn = 0 then
    tCastlePieceList = player1CastlePieceList
    tCastlePiecePosListDefault = player1PiecePosListDefault
    myMeterSpr = sprite(sprNum.player1Meter_bmp)
  end if
  tDamageCount = 0
  tFlagCount = 0
  iCount = tCastlePieceList.count
  repeat with i = 1 to iCount
    if tCastlePieceList[i].name contains "flag" then
      tFlagCount = tFlagCount + 1
      next repeat
    end if
    newPos = tCastlePieceList[i].getWorldTransform().position
    oldPos = tCastlePiecePosListDefault[i]
    tDist = Math.getDist(newPos, oldPos)
    if tDist.total > 5.0 then
      tDamageCount = tDamageCount + 1
    end if
  end repeat
  tDamagePerc = float(tDamageCount) / (iCount - tFlagCount)
  tDamagePerc = integer(100 * tDamagePerc)
  relativeDamagePerc = 1.0 - (tDamagePerc / float(damageGoal))
  return tDamagePerc
end

on gameOver me
  game_state = #gameOver
  sprite(sprNum.tallyNames_txt).visible = 0
  sprite(sprNum.tallyTotals_txt).visible = 0
  sprite(sprNum.gameWorld_w3d).visible = 0
  sprite(sprNum.gameOver_txt).visible = 1
  sprite(sprNum.gameOver_txt).member.text = "Game Over"
end

on castlesConquered me
  game_state = #castlesConquered
  me.setStageVisibility(#castlesConquered)
  sprite(sprNum.hint_txt).member.text = RETURN & "- Press Any Key To Continue -"
end

on soundToggle me
  soundOn = not soundOn
end

on makeBoom me, tPos
  smokeCount = smokeCount + 1
  nmr = w.newModelResource("smokeSource" & smokeCount, #particle)
  nmr.emitter.mode = #stream
  nmr.emitter.loop = 10
  nmr.emitter.minSpeed = 0.10000000000000001
  nmr.emitter.maxSpeed = 12
  nmr.emitter.direction = vector(0, 0, 1)
  nmr.colorRange.start = rgb(255, 255, 0)
  nmr.colorRange.end = rgb(255, 160, 0)
  nmr.sizeRange.start = 0.5
  nmr.gravity = vector(0, 0, 1)
  nmr.lifeTime = 2000
  nmr.emitter.numParticles = 2000
  nm = w.newModel("smoke" & smokeCount, nmr)
  nm.transform.position = tPos
end

on makeSmoke me, tPos, opacityOffsetPerc
  smokeCount = smokeCount + 1
  nmr = w.newModelResource("smokeSource" & smokeCount, #particle)
  nmr.emitter.mode = #burst
  nmr.emitter.loop = 0
  nmr.emitter.minSpeed = 0.5
  nmr.emitter.maxSpeed = 2
  nmr.emitter.direction = vector(-1, 0, 0)
  nmr.colorRange.start = rgb(90, 90, 90)
  nmr.colorRange.end = rgb(140, 140, 140)
  nmr.sizeRange.start = 3
  nmr.sizeRange.end = 5
  nmr.blendRange.start = 80.0 * opacityOffsetPerc
  nmr.blendRange.end = 0
  nmr.gravity = vector(0, 0, -0.5)
  nmr.wind = vector(0, 2, 0)
  nmr.lifeTime = 1500
  nmr.emitter.numParticles = 100
  nm = w.newModel("smoke" & smokeCount, nmr)
  nm.transform.position = tPos
end

on makeStreamSmoke me, tPos, Dir
  smokeCount = smokeCount + 1
  nmr = w.newModelResource("smokeSource" & smokeCount, #particle)
  nmr.emitter.mode = #stream
  nmr.emitter.loop = 0
  nmr.emitter.minSpeed = 0.10000000000000001
  nmr.emitter.maxSpeed = 1
  nmr.emitter.direction = vector(1 * Dir, 0, 0)
  nmr.colorRange.start = rgb(200, 200, 200)
  nmr.colorRange.end = rgb(50, 50, 90)
  nmr.sizeRange.start = 0.5
  nmr.sizeRange.end = 1
  nmr.blendRange.start = 40.0
  nmr.blendRange.end = 0
  nmr.gravity = vector(0.40000000000000002 * Dir, 0, 0.01)
  nmr.wind = vector(0, 0, 1)
  nmr.lifeTime = 1300
  nmr.emitter.numParticles = 800
  nm = w.newModel("smoke" & smokeCount, nmr)
  nm.transform.position = tPos
end

on makeSmokePoof me, tPos, velPerc
  smokeCount = smokeCount + 1
  nmr = w.newModelResource("smokeSource" & smokeCount, #particle)
  nmr.emitter.mode = #burst
  nmr.emitter.loop = 0
  nmr.emitter.minSpeed = 1
  nmr.emitter.maxSpeed = 17 * velPerc
  nmr.emitter.direction = vector(-1, 0, 0)
  nmr.colorRange.start = rgb(120, 120, 120)
  nmr.colorRange.end = rgb(200, 200, 200)
  nmr.sizeRange.start = 1
  nmr.sizeRange.end = 3
  nmr.blendRange.start = 80.0 * velPerc
  nmr.blendRange.end = 0
  nmr.gravity = vector(0, 0, -0.5)
  nmr.wind = vector(0, 2, 0)
  nmr.lifeTime = 800
  nmr.emitter.numParticles = 20
  nm = w.newModel("smoke" & smokeCount, nmr)
  nm.transform.position = tPos
end

on makeAsplode me, tPos, velPerc
  playerDir = -1
  if player1Turn then
    playerDir = 1
  end if
  smokeCount = smokeCount + 1
  nmr = w.newModelResource("smokeSource" & smokeCount, #particle)
  nmr.texture = asplode_texture
  nmr.emitter.mode = #burst
  nmr.emitter.loop = 0
  nmr.emitter.minSpeed = 30
  nmr.emitter.maxSpeed = 60
  nmr.emitter.direction = vector(10 * playerDir, 0, 0)
  nmr.sizeRange.start = 5
  nmr.gravity = vector(0, 0, -1)
  nmr.lifeTime = 2000
  nmr.emitter.numParticles = 5
  nm = w.newModel("smoke" & smokeCount, nmr)
  nm.transform.position = tPos
  smokeCount = smokeCount + 1
  nmr = w.newModelResource("smokeSource" & smokeCount, #particle)
  nmr.emitter.mode = #burst
  nmr.emitter.loop = 0
  nmr.emitter.minSpeed = 5
  nmr.emitter.maxSpeed = 30
  nmr.emitter.direction = vector(0, 0, 1)
  nmr.colorRange.start = rgb(255, 255, 0)
  nmr.colorRange.end = rgb(180, 0, 0)
  nmr.sizeRange.start = 1
  nmr.sizeRange.end = 3
  nmr.blendRange.start = 70
  nmr.blendRange.end = 0
  nmr.gravity = vector(0, 0, -1)
  nmr.lifeTime = 5000
  nmr.emitter.numParticles = 100
  nm = w.newModel("smoke" & smokeCount, nmr)
  nm.transform.position = tPos
  smokeCount = smokeCount + 1
  nmr = w.newModelResource("smokeSource" & smokeCount, #particle)
  nmr.emitter.mode = #burst
  nmr.emitter.loop = 0
  nmr.emitter.minSpeed = 10
  nmr.emitter.maxSpeed = 35
  nmr.emitter.direction = vector(-1, 0, 0)
  nmr.colorRange.start = rgb(120, 120, 120)
  nmr.colorRange.end = rgb(200, 200, 200)
  nmr.sizeRange.start = 1
  nmr.sizeRange.end = 3
  nmr.blendRange.start = 80.0
  nmr.blendRange.end = 0
  nmr.gravity = vector(0, playerDir, -0.5)
  nmr.wind = vector(0, 2, 0)
  nmr.lifeTime = 800
  nmr.emitter.numParticles = 20
  nm = w.newModel("smoke" & smokeCount, nmr)
  nm.transform.position = tPos
end

on clearSmoke me
  repeat with i = 1 to smokeCount
    w.deleteModel("smoke" & i)
    w.deleteModelResource("smokeSource" & i)
  end repeat
  smokeCount = 0
end

on getScore me
  myScore = integer(member("gameScore_txt").text)
  return myScore
end

on setStageVisibility me, stageMode
  if stageMode = #castleSelect then
    sprite(sprNum.castleUnlock).visible = 1
    sprite(sprNum.gameWorld_w3d).visible = 0
    sprite(sprNum.castlesConquered_bmp).visible = 0
    sprite(sprNum.tallyNames_txt).visible = 0
    sprite(sprNum.tallyTotals_txt).visible = 0
    sprite(sprNum.restart_txt).visible = 1
    sprite(sprNum.flags_txt).visible = 1
    sprite(sprNum.accuracyMarker_bmp).visible = 1
    sprite(sprNum.level_txt).visible = 1
    sprite(sprNum.gameOver_txt).visible = 0
    sprite(sprNum.powerMeterContainer_bmp).visible = 1
    sprite(sprNum.powerMeter_bmp).visible = 0
    sprite(sprNum.powerMeterTint_bmp).visible = 1
    sprite(sprNum.rotationDial_bmp).visible = 1
    sprite(sprNum.angleDial_bmp).visible = 1
    repeat with i = sprNum.castleSelectButtonFirst to sprNum.castleSelectButtonLast
      navButtonSprite = sprite(i)
      navButtonSprite.visible = 1
    end repeat
    sprite(sprNum.gold_txt).visible = 1
    sprite(sprNum.goldScore_txt).visible = 1
    sprite(sprNum.score_txt).visible = 1
    sprite(sprNum.gameScore_txt).visible = 1
    sprite(sprNum.toolbarCover_bmp).visible = 0
  else
    if stageMode = #castlesConquered then
      sprite(sprNum.castleUnlock).visible = 0
      sprite(sprNum.gameWorld_w3d).visible = 0
      sprite(sprNum.castlesConquered_bmp).visible = 1
      sprite(sprNum.tallyNames_txt).visible = 0
      sprite(sprNum.tallyTotals_txt).visible = 0
      sprite(sprNum.restart_txt).visible = 1
      sprite(sprNum.flags_txt).visible = 1
      sprite(sprNum.accuracyMarker_bmp).visible = 1
      sprite(sprNum.level_txt).visible = 1
      sprite(sprNum.gameOver_txt).visible = 0
      sprite(sprNum.powerMeterContainer_bmp).visible = 1
      sprite(sprNum.powerMeter_bmp).visible = 0
      sprite(sprNum.powerMeterTint_bmp).visible = 1
      sprite(sprNum.rotationDial_bmp).visible = 1
      sprite(sprNum.angleDial_bmp).visible = 1
      repeat with i = sprNum.castleSelectButtonFirst to sprNum.castleSelectButtonLast
        navButtonSprite = sprite(i)
        navButtonSprite.visible = 0
      end repeat
      sprite(sprNum.gold_txt).visible = 1
      sprite(sprNum.goldScore_txt).visible = 1
      sprite(sprNum.score_txt).visible = 1
      sprite(sprNum.gameScore_txt).visible = 1
      sprite(sprNum.toolbarCover_bmp).visible = 0
    else
      if stageMode = #game then
        sprite(sprNum.castleUnlock).visible = 0
        sprite(sprNum.gameWorld_w3d).visible = 1
        sprite(sprNum.castlesConquered_bmp).visible = 0
        sprite(sprNum.tallyNames_txt).visible = 0
        sprite(sprNum.tallyTotals_txt).visible = 0
        sprite(sprNum.level_txt).visible = 1
        sprite(sprNum.restart_txt).visible = 1
        sprite(sprNum.gameOver_txt).visible = 0
        sprite(sprNum.gameWorld_w3d).visible = 1
        sprite(sprNum.restart_txt).visible = 1
        sprite(sprNum.flags_txt).visible = 1
        sprite(sprNum.accuracyMarker_bmp).visible = 1
        sprite(sprNum.powerMeterContainer_bmp).visible = 1
        sprite(sprNum.powerMeter_bmp).visible = 0
        sprite(sprNum.accuracyMeter_bmp).visible = 0
        sprite(sprNum.powerMeterTint_bmp).visible = 1
        sprite(sprNum.rotationDial_bmp).visible = 1
        sprite(sprNum.angleDial_bmp).visible = 1
        repeat with i = sprNum.castleSelectButtonFirst to sprNum.castleSelectButtonLast
          navButtonSprite = sprite(i)
          navButtonSprite.visible = 0
        end repeat
        sprite(sprNum.gold_txt).visible = 1
        sprite(sprNum.goldScore_txt).visible = 1
        sprite(sprNum.score_txt).visible = 1
        sprite(sprNum.gameScore_txt).visible = 1
      else
        if stageMode = #tallyScore then
          sprite(sprNum.castlesConquered_bmp).visible = 0
          sprite(sprNum.tallyNames_txt).visible = 1
          sprite(sprNum.tallyTotals_txt).visible = 1
          sprite(sprNum.gameWorld_w3d).visible = 0
          sprite(sprNum.gameOver_txt).visible = 0
          sprite(sprNum.level_txt).visible = 1
        end if
      end if
    end if
  end if
end

on getCannon me, castlePieceList
  tCannon = VOID
  tCount = castlePieceList.count
  repeat with i = 1 to tCount
    tCastlePiece = castlePieceList[i]
    if tCastlePiece.name contains "cannon" then
      tCannon = tCastlePiece
      exit repeat
    end if
  end repeat
  return tCannon
end

on initGameWorld me
  member("gameWorld").resetWorld()
  mBall = w.model("ball")
  mBall.visibility = #none
  w.model("pivot_camBall").visibility = #none
  w.model("pivot_camAim").visibility = #none
  w.model("ballShadow").visibility = #none
  w.model("ballShadowShape").visibility = #none
  w.model("p_isectPlane").visibility = #none
  t1 = w.newTexture("crosshair_texture", #fromCastMember, member("crosshair"))
  w.camera("cam_aimShape").addOverlay(t1, point(195, 140), 0)
  t2 = w.newTexture("gameWorldOverlay", #fromCastMember, member("gameWorldOverlay"))
  t2.renderFormat = #rgba8888
  repeat with i = 5 to 15
    w.camera[i].addOverlay(t2, point(0, 0), 0)
  end repeat
  w.shader("blinn4").emissive = rgb(255, 255, 255)
  asplode_texture = w.newTexture("asplode_texture", #fromCastMember, member("brick_bmp"))
end

on initCastleSelect me
  me.displayScore(1)
  sprite(sprNum.level_txt).member.text = "Level " & roundCount + 1
  me.setStageVisibility(#castleSelect)
  mouseIsUp_boolean = 1
  keyIsUp_boolean = 1
  me.updateCastleSelectButtonActiveStatus()
  game_state = #castleSelect
  defaultHint_txt = "Select Your Castle"
  sprite(sprNum.hint_txt).member.text = defaultHint_txt
end

on updateCastleSelectButtonActiveStatus me
  playerGold = player1Gold
  repeat with i = sprNum.castleSelectButtonFirst to sprNum.castleSelectButtonLast
    shopButtonSprite = sprite(i)
    itemPrice = shopButtonSprite.getPrice()
    if itemPrice > playerGold then
      shopButtonSprite.deactivate()
      next repeat
    end if
    shopButtonSprite.activate()
  end repeat
end

on displayCastleItem me, active, castleName, castlePrice
  if active then
    hint_txt = castleName
  else
    hint_txt = castleName & " Unlocks At " & castlePrice & " Gold."
  end if
  sprite(sprNum.hint_txt).member.text = hint_txt
end

on unDisplayCastleItem me
  sprite(sprNum.hint_txt).member.text = defaultHint_txt
end

on selectCastle me, castleNum
  me.initGameWorld()
  me.pickCam("castle1")
  player1CastleDataList = castleBuilder.getCastleDataList(castleNum)
  player1CastlePieceList = castleBuilder.makeCastle(player1CastleDataList, 1)
  player1Cannon = me.getCannon(player1CastlePieceList)
  castleData_str = me.encodeCastleData(player1CastlePieceList)
  player1CastleDataList = castleBuilder.parseCastleData(castleData_str)
  me.nextRoundInit()
end

on getModelName me, modelName
  worldName = "Castle Piece"
  if modelName contains "wallA" then
    worldName = "wallA"
  else
    if modelName contains "wallB" then
      worldName = "wallB"
    else
      if modelName contains "towerA" then
        worldName = "towerA"
      else
        if modelName contains "wallTopA" then
          worldName = "wallTopA"
        else
          if modelName contains "wallTopB" then
            worldName = "wallTopB"
          else
            if modelName contains "towerTopA" then
              worldName = "towerTopA"
            else
              if modelName contains "drawbridgeA" then
                worldName = "drawbridgeA"
              else
                if modelName contains "archA" then
                  worldName = "archA"
                else
                  if modelName contains "towerTopB" then
                    worldName = "towerTopB"
                  else
                    if modelName contains "wallPieceA" then
                      worldName = "wallPieceA"
                    else
                      if modelName contains "supportA" then
                        worldName = "supportA"
                      else
                        if modelName contains "supportB" then
                          worldName = "supportB"
                        else
                          if modelName contains "cannonA" then
                            worldName = "cannonA"
                          else
                            if modelName contains "cannonB" then
                              worldName = "cannonB"
                            else
                              if modelName contains "flagPoleC" then
                                worldName = "flagPoleC"
                              end if
                            end if
                          end if
                        end if
                      end if
                    end if
                  end if
                end if
              end if
            end if
          end if
        end if
      end if
    end if
  end if
  return worldName
end

on encodeCastleData me, castlePieceList
  castleData_str = EMPTY
  iCount = castlePieceList.count
  repeat with i = 1 to iCount
    castlePiece = castlePieceList[i]
    castleName = me.getModelName(castlePiece.name)
    tx = integer(castlePiece.transform.position.x)
    ty = integer(castlePiece.transform.position.y)
    tz = integer(castlePiece.transform.position.z)
    rx = integer(castlePiece.transform.rotation.x)
    ry = integer(castlePiece.transform.rotation.y)
    rz = integer(castlePiece.transform.rotation.z)
    castleData_str = castleData_str & castleName & "," & tx & "," & ty & "," & tz & "," & rz & ","
  end repeat
  delete castleData_str.char[castleData_str.length]
  return castleData_str
end

on displayScore me, player
  sprite(sprNum.gold_txt).member.text = "Gold:"
  sprite(sprNum.goldScore_txt).member.text = string(integer(player1Gold))
  sprite(sprNum.score_txt).member.text = "Score:"
  sprite(sprNum.gameScore_txt).member.text = string(integer(player1Score))
end

on displayPlayer me, player
  sprite(sprNum.gold_txt).member.text = EMPTY
  sprite(sprNum.goldScore_txt).member.text = "Player " & player
  sprite(sprNum.score_txt).member.text = EMPTY
  sprite(sprNum.gameScore_txt).member.text = EMPTY
end

on startButtonPressed me, playerCount
  if playerCount = 1 then
    player2Type = #computer
  else
    player2Type = #human
  end if
  resetPowerMeter()
  game_state = #init
end

on saveCastleSharedObject me
  castleConquestSharedObject.data.gold = player1Gold
end
