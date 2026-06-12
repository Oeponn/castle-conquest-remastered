global sprNum

on beginSprite me
  sprite(me.spriteNum).visible = 1
end

on mouseUp me
  sprite(sprNum.intro_swf).goToFrame("closeScroll_frame")
  go("intro")
end
