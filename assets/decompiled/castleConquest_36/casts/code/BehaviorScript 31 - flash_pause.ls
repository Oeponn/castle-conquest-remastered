on exitFrame me
  if sprite(me.spriteNum).frame < 67 then
    go(the frame)
  else
    go("intro")
  end if
end
