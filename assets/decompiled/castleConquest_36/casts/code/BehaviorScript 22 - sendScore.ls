global objGame, sprNum

on beginSprite me
end

on mouseUp me
  sprite(sprNum.gameWorld_w3d).visible = 0
  myScore = objGame.getScore()
  go("sendscore")
end
