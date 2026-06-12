global objGame

on beginSprite me
  sprite(me.spriteNum).visible = 0
end

on mouseUp me
  objGame.castleSelected()
  sprite(me.spriteNum).visible = 0
end
