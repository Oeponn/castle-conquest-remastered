global objGame, sprNum

on beginSprite me
  sprite(me.spriteNum).visible = 1
end

on mouseUp me
  objGame.beginround()
end
