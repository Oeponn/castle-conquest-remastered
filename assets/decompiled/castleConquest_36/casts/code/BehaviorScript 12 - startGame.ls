global objGame

on beginSprite me
  sprite(me.spriteNum).visible = 1
end

on mouseUp me
  objGame.startGame(#human, #computer)
  go("start_transition")
end
