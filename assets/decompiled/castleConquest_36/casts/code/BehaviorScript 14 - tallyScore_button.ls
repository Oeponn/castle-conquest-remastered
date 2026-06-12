global objGame

on beginSprite me
  sprite(me.spriteNum).visible = 0
end

on mouseUp me
  objGame.tallyScore()
  sprite(me.spriteNum).visible = 0
end
