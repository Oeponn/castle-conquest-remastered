global sprNum

on beginSprite me
  sprite(me.spriteNum).visible = 1
end

on mouseUp me
  sprite(sprNum.intro_swf).goToFrame("instructions_frame")
  go("instructions")
end
