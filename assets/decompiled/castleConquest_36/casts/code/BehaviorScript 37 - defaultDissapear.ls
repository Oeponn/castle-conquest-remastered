property my

on beginSprite me
  my = sprite(me.spriteNum)
end

on mouseDown
  if my.member.text = "default" then
    my.member.text = EMPTY
  end if
end
