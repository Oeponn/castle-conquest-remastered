property my
global objGame

on beginSprite me
  my = sprite(me.spriteNum)
  my.blend = 0
end

on mouseEnter me
  my.blend = 100
  sprite(me.spriteNum).cursor = 280
end

on mouseLeave me
  my.blend = 0
  sprite(me.spriteNum).cursor = -1
end

on mouseUp me
  go("instructions")
end
