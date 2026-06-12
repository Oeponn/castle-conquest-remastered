property Math

on new me
  Math = script("mathClass").new()
  return me
end

on setPower me, roundCount, turnCount, tMaxPower, mBall, piecePosListDefault, currentPieceList
  minGoldDist = 447.0
  maxGoldDist = 595.0
  minPowerPerc = 0.87
  maxPowerPerc = 1.0
  posA = mBall.getWorldTransform().position
  availablePieceList = []
  iCount = currentPieceList.count
  repeat with i = 1 to iCount
    piece = currentPieceList[i]
    rotAbsX = abs(piece.getWorldTransform().rotation.x)
    rotAbsY = abs(piece.getWorldTransform().rotation.y)
    if ((rotAbsX > 20) or (rotAbsY > 20)) = 0 then
      if currentPieceList[i].name contains "flag" then
        availablePieceList.add(currentPieceList[i])
      end if
    end if
  end repeat
  if availablePieceList.count > 0 then
    tRandPiece = random(availablePieceList.count)
    if tRandPiece <= 0 then
      tRandPiece = 1
    end if
    mGold = availablePieceList[tRandPiece]
    posB = mGold.getWorldTransform().position
  else
    posB = vector(-200, 0, 0)
  end if
  tRoundCount = roundCount
  if tRoundCount > 10 then
    tRoundCount = 10
  end if
  tDumbnessOffset = random(41) - 21
  tDumbnessInfluence = (1.0 - (tRoundCount / 10.0)) * 0.20000000000000001
  tDumbnessOffset = tDumbnessOffset * tDumbnessInfluence
  tDist = Math.getDist(posA, posB)
  tAngle = Math.getAngleXY(tDist.x, tDist.y) + tDumbnessOffset
  mBall.rotate(0, 0, tAngle, #self)
  tDumbnessOffsetPerc = 1
  if turnCount > 10 then
    tOffset = turnCount mod 3
    if tOffset = 1 then
      tDumbnessOffsetPerc = 0.80000000000000004
    else
      if tOffset = 2 then
        tDumbnessOffsetPerc = 0.59999999999999998
      else
        tDumbnessOffsetPerc = 1
      end if
    end if
  end if
  tDistPerc = (tDist.total - minGoldDist) / (maxGoldDist - minGoldDist)
  tPowerPerc = minPowerPerc + ((maxPowerPerc - minPowerPerc) * tDistPerc)
  tPower = tMaxPower * tPowerPerc * tDumbnessOffsetPerc
  if turnCount > 3 then
    if turnCount < 7 then
      extraTurnCount = turnCount - 3
      fivePercPower = tPower * 0.02
      powerDif = extraTurnCount * fivePercPower
      tPower = tPower - powerDif
    end if
  end if
  return tPower
end
